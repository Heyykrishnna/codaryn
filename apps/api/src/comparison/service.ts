import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  versionSnapshotSchema,
  versionSummarySchema,
  comparisonResultSchema,
  studioManifestSchema,
} from "@codaryn/contracts";
import {
  compareVersions,
  digest,
  ComparisonLimitError,
} from "@codaryn/version-engine";
import { WorkspaceAccessError } from "@codaryn/database";
import { ArtifactSnapshots, type ArtifactRow } from "../artifacts/snapshots.js";
import { RequestFailure } from "../http/access.js";
const summary = (row: ArtifactRow) =>
  versionSummarySchema.parse({
    id: row.id,
    jobId: row.job_id,
    repositoryId: row.repository_id,
    commitSha: row.commit_sha,
    status: row.status,
    hash: row.hash,
    fileCount: row.object_count,
    failureCode: row.failure_code,
    createdAt: row.created_at.toISOString(),
  });
export class ComparisonService {
  private readonly store: ArtifactSnapshots;
  constructor(pool: Pool) {
    this.store = new ArtifactSnapshots(pool, "version");
  }
  private async admin(client: PoolClient, workspace: string, actor: string) {
    const roles = await client.query<{ role: string }>(
      "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR SHARE",
      [workspace, actor],
    );
    if (!["owner", "admin"].includes(roles.rows[0]?.role ?? ""))
      throw new RequestFailure(
        403,
        "FORBIDDEN",
        "Only administrators can configure push analysis",
      );
  }
  jobs(actor: string, workspace: string) {
    return this.store.jobs(actor, workspace);
  }
  async list(actor: string, workspace: string, page: number) {
    return {
      snapshots: (await this.store.list(actor, workspace, page)).map(summary),
      page,
      pageSize: 20,
    };
  }
  async request(
    actor: string,
    workspace: string,
    jobId: string,
    baseId: string | null,
    verify: boolean,
  ) {
    return summary(
      await this.store.request(actor, workspace, jobId, verify, baseId),
    );
  }
  overview(actor: string, workspace: string, id: string) {
    return this.store.workspace(actor, workspace, async (client) => {
      const row = await this.store.load(client, workspace, id),
        snapshot =
          row.status === "completed"
            ? versionSnapshotSchema.parse(row.snapshot)
            : null;
      return {
        snapshot: summary(row),
        reuse: snapshot?.reuse ?? null,
        analyzer: snapshot?.analyzer ?? null,
        contentHash: snapshot?.contentHash ?? null,
        symbols:
          snapshot?.files.reduce((n, file) => n + file.symbols.length, 0) ?? 0,
        relationships: snapshot?.edges.length ?? 0,
        schemaObjects: snapshot?.schema.length ?? 0,
        diagnostics:
          (snapshot?.files.reduce(
            (n, file) => n + file.diagnostics.length,
            0,
          ) ?? 0) + (snapshot?.schemaDiagnostics ?? 0),
      };
    });
  }
  async ready(client: PoolClient, workspace: string, id: string) {
    const row = await this.store.load(client, workspace, id);
    if (row.status !== "completed")
      throw new RequestFailure(
        409,
        "VERSION_NOT_READY",
        "Wait for both version snapshots to complete",
      );
    return { row, data: versionSnapshotSchema.parse(row.snapshot) };
  }
  compare(actor: string, workspace: string, fromId: string, toId: string) {
    return this.store.workspace(
      actor,
      workspace,
      async (client) => {
        const before = await this.ready(client, workspace, fromId),
          after = await this.ready(client, workspace, toId);
        if (before.row.repository_id !== after.row.repository_id)
          throw new RequestFailure(
            400,
            "REPOSITORY_MISMATCH",
            "Select versions of the same repository",
          );
        const existing = await client.query<{ id: string; hash: string }>(
          "SELECT id,hash FROM architecture_comparisons WHERE from_id=$1 AND to_id=$2 AND organization_id=$3",
          [fromId, toId, workspace],
        );
        if (existing.rows[0]) return existing.rows[0];
        const count = await client.query<{ count: string }>(
          "SELECT count(*) FROM architecture_comparisons WHERE organization_id=$1 AND created_at>now()-interval '1 minute'",
          [workspace],
        );
        if (Number(count.rows[0].count) >= 10)
          throw new RequestFailure(
            429,
            "COMPARISON_LIMIT",
            "Wait before requesting more comparisons",
          );
        let result: ReturnType<typeof compareVersions>;
        try {
          result = compareVersions(before.data, after.data);
        } catch (error) {
          if (error instanceof ComparisonLimitError)
            throw new RequestFailure(
              422,
              "COMPARISON_LIMIT",
              "Comparison exceeds supported bounds",
            );
          throw error;
        }
        const hash = digest(result),
          id = randomUUID();
        if (Buffer.byteLength(JSON.stringify(result)) > 20 * 1024 * 1024)
          throw new RequestFailure(
            422,
            "COMPARISON_LIMIT",
            "Comparison exceeds supported bounds",
          );
        await client.query(
          "INSERT INTO architecture_comparisons(id,organization_id,repository_id,actor_id,from_id,to_id,result,hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
          [
            id,
            workspace,
            before.row.repository_id,
            actor,
            fromId,
            toId,
            result,
            hash,
          ],
        );
        await client.query(
          "INSERT INTO audit_events(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'architecture.compared',$4)",
          [randomUUID(), workspace, actor, id],
        );
        return { id, hash };
      },
      true,
    );
  }
  comparisons(actor: string, workspace: string, page: number) {
    return this.store.workspace(actor, workspace, async (client) => {
      const rows = await client.query<{
        id: string;
        from_id: string;
        to_id: string;
        hash: string;
        created_at: Date;
      }>(
        "SELECT id,from_id,to_id,hash,created_at FROM architecture_comparisons WHERE organization_id=$1 ORDER BY created_at DESC,id LIMIT 20 OFFSET $2",
        [workspace, (page - 1) * 20],
      );
      return {
        items: rows.rows.map((row) => ({
          id: row.id,
          fromId: row.from_id,
          toId: row.to_id,
          hash: row.hash,
          createdAt: row.created_at.toISOString(),
        })),
        page,
        pageSize: 20,
      };
    });
  }
  detail(
    actor: string,
    workspace: string,
    id: string,
    query: {
      page: number;
      search: string;
      view: "changes" | "schema" | "impact";
      kind: string;
    },
  ) {
    return this.store.workspace(actor, workspace, async (client) => {
      const rows = await client.query<{
          result: unknown;
          hash: string;
          from_id: string;
          to_id: string;
        }>(
          "SELECT result,hash,from_id,to_id FROM architecture_comparisons WHERE id=$1 AND organization_id=$2",
          [id, workspace],
        ),
        row = rows.rows[0];
      if (!row) throw new WorkspaceAccessError();
      const result = comparisonResultSchema.parse(row.result),
        items =
          query.view === "impact"
            ? result.impact
            : result.changes.filter(
                (item) =>
                  (query.view !== "schema" ||
                    !["file", "symbol", "relationship"].includes(
                      item.object,
                    )) &&
                  (!query.kind || item.kind === query.kind),
              );
      const filtered = items.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(query.search.toLowerCase()),
      );
      return {
        id,
        hash: row.hash,
        fromId: row.from_id,
        toId: row.to_id,
        items: filtered.slice((query.page - 1) * 50, query.page * 50),
        total: filtered.length,
        page: query.page,
        pageSize: 50,
        drift: result.drift,
        truncated: result.truncated,
        semantics: result.semantics,
      };
    });
  }
  policy(
    actor: string,
    workspace: string,
    jobId: string,
    ref: string,
    enabled: boolean,
  ) {
    return this.store.workspace(
      actor,
      workspace,
      async (client) => {
        await this.admin(client, workspace, actor);
        const rows = await client.query<{
          repository_id: string;
          manifest_id: string;
          manifest: unknown;
        }>(
          "SELECT j.repository_id,j.manifest_id,m.manifest FROM analysis_jobs j JOIN analysis_manifests m ON m.id=j.manifest_id JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id WHERE j.id=$1 AND j.organization_id=$2 AND m.organization_id=$2 AND m.repository_id=j.repository_id AND i.organization_id=$2 AND i.connected=true AND r.active=true FOR SHARE OF j,m,r,i",
          [jobId, workspace],
        );
        const row = rows.rows[0];
        if (!row) throw new WorkspaceAccessError();
        studioManifestSchema.parse(row.manifest);
        await client.query(
          "INSERT INTO repository_analysis_policies(repository_id,organization_id,manifest_id,actor_id,ref,enabled) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(repository_id) DO UPDATE SET manifest_id=$3,actor_id=$4,ref=$5,enabled=$6,updated_at=now()",
          [row.repository_id, workspace, row.manifest_id, actor, ref, enabled],
        );
        await client.query(
          "INSERT INTO audit_events(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'architecture.policy.updated',$4)",
          [randomUUID(), workspace, actor, row.repository_id],
        );
        return { enabled, ref, repositoryId: row.repository_id };
      },
      true,
    );
  }
  policies(actor: string, workspace: string) {
    return this.store.workspace(actor, workspace, async (client) => {
      const rows = await client.query<{
        repository_id: string;
        ref: string;
        enabled: boolean;
      }>(
        "SELECT repository_id,ref,enabled FROM repository_analysis_policies WHERE organization_id=$1 LIMIT 100",
        [workspace],
      );
      const role = await client.query<{ role: string }>(
        "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",
        [workspace, actor],
      );
      return {
        items: rows.rows.map((row) => ({
          repositoryId: row.repository_id,
          ref: row.ref,
          enabled: row.enabled,
        })),
        canManage: ["owner", "admin"].includes(role.rows[0]?.role ?? ""),
      };
    });
  }
}
