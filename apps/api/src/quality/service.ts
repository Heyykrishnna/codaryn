import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  qualitySnapshotSchema,
  qualitySummarySchema,
  findingReviewSchema,
  findingStateSchema,
  findingSeveritySchema,
  findingReasonSchema,
  type QualitySnapshot,
} from "@codaryn/contracts";
import { WorkspaceAccessError } from "@codaryn/database";
import { ArtifactSnapshots, type ArtifactRow } from "../artifacts/snapshots.js";
import { RequestFailure } from "../http/access.js";
export const reviewInputSchema = z.strictObject({
  findingId: z.string().min(1).max(1024),
  state: findingStateSchema,
  severity: findingSeveritySchema.nullable(),
  reason: findingReasonSchema,
  revision: z.number().int().min(0).max(1000000),
});
type ReviewRow = {
  snapshot_id: string;
  finding_id: string;
  state: string;
  severity: string | null;
  reason: string;
  revision: number;
  actor_id: string;
  updated_at: Date;
};
const review = (row: ReviewRow) =>
  findingReviewSchema.parse({
    snapshotId: row.snapshot_id,
    findingId: row.finding_id,
    state: row.state,
    severity: row.severity,
    reason: row.reason,
    revision: row.revision,
    actorId: row.actor_id,
    updatedAt: row.updated_at.toISOString(),
  });
const summary = (row: ArtifactRow) =>
  qualitySummarySchema.parse({
    id: row.id,
    jobId: row.job_id,
    commitSha: row.commit_sha,
    status: row.status,
    hash: row.hash,
    findingCount: row.object_count,
    failureCode: row.failure_code,
    createdAt: row.created_at.toISOString(),
  });
export class QualityService {
  private readonly store: ArtifactSnapshots;
  constructor(
    pool: Pool,
    private readonly allowExternal = false,
  ) {
    this.store = new ArtifactSnapshots(pool, "quality");
  }
  private ready(row: ArtifactRow): QualitySnapshot {
    if (row.status !== "completed")
      throw new RequestFailure(
        409,
        "QUALITY_NOT_READY",
        "Wait for analysis to complete",
      );
    return qualitySnapshotSchema.parse(row.snapshot);
  }
  private async permissions(
    client: PoolClient,
    workspace: string,
    actor: string,
  ) {
    const roles = await client.query<{ role: string }>(
      "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR SHARE",
      [workspace, actor],
    );
    return ["owner", "admin"].includes(roles.rows[0]?.role ?? "");
  }
  private async findings(
    client: PoolClient,
    snapshotId: string,
    data: QualitySnapshot,
  ) {
    const rows = await client.query<ReviewRow>(
        "SELECT * FROM quality_finding_reviews WHERE snapshot_id=$1 LIMIT 20000",
        [snapshotId],
      ),
      reviews = new Map(rows.rows.map((row) => [row.finding_id, review(row)]));
    return data.findings.map((finding) => {
      const current = reviews.get(finding.id);
      return {
        ...finding,
        state: current?.state ?? "open",
        effectiveSeverity: current?.severity ?? finding.severity,
        review: current ?? null,
      };
    });
  }
  async request(
    actor: string,
    workspace: string,
    jobId: string,
    external: boolean,
  ) {
    if (external && !this.allowExternal)
      throw new RequestFailure(
        403,
        "EXTERNAL_SCANS_DISABLED",
        "External scans are disabled by deployment policy",
      );
    return summary(await this.store.request(actor, workspace, jobId, external));
  }
  async list(actor: string, workspace: string, page: number) {
    return {
      snapshots: (await this.store.list(actor, workspace, page)).map(summary),
      page,
      pageSize: 20,
    };
  }
  jobs(actor: string, workspace: string) {
    return this.store.jobs(actor, workspace);
  }
  overview(actor: string, workspace: string, id: string) {
    return this.store.workspace(actor, workspace, async (client) => {
      const row = await this.store.load(client, workspace, id),
        data = row.status === "completed" ? this.ready(row) : null;
      const findings = data ? await this.findings(client, id, data) : [],
        groups: Record<string, number> = {};
      for (const finding of findings)
        groups[finding.effectiveSeverity] =
          (groups[finding.effectiveSeverity] ?? 0) + 1;
      return {
        snapshot: summary(row),
        resources: data?.resources.length ?? 0,
        tests: data?.tests.length ?? 0,
        dependencies: data?.dependencies.length ?? 0,
        findings: findings.length,
        groups,
        scanners: data?.scanners ?? [],
        diagnostics: data?.diagnostics.slice(0, 30) ?? [],
        diagnosticCount: data?.diagnostics.length ?? 0,
        canReview: await this.permissions(client, workspace, actor),
        externalScansAvailable: this.allowExternal,
      };
    });
  }
  objects(
    actor: string,
    workspace: string,
    id: string,
    query: {
      kind:
        | "resources"
        | "tests"
        | "coverage"
        | "dependencies"
        | "environment"
        | "findings";
      page: number;
      search: string;
      severity: string;
      state: string;
      tool: string;
      category: string;
    },
  ) {
    return this.store.workspace(actor, workspace, async (client) => {
      const data = this.ready(await this.store.load(client, workspace, id));
      let items: unknown[];
      if (query.kind === "findings")
        items = (await this.findings(client, id, data)).filter(
          (item) =>
            (!query.severity || item.effectiveSeverity === query.severity) &&
            (!query.state || item.state === query.state) &&
            (!query.tool || item.tool === query.tool) &&
            (!query.category || item.category === query.category) &&
            (!query.search ||
              `${item.title} ${item.ruleId} ${item.evidence.path}`
                .toLowerCase()
                .includes(query.search.toLowerCase())),
        );
      else
        items = data[query.kind].filter(
          (item) =>
            !query.search ||
            JSON.stringify(item)
              .toLowerCase()
              .includes(query.search.toLowerCase()),
        );
      return {
        items: items
          .slice((query.page - 1) * 50, query.page * 50)
          .map((item) =>
            query.kind === "findings"
              ? item
              : {
                  ...z.record(z.string(), z.unknown()).parse(item),
                  view: {
                    resources: "resource",
                    tests: "test",
                    coverage: "coverage",
                    dependencies: "dependency",
                    environment: "environment",
                  }[query.kind],
                },
          ),
        total: items.length,
        page: query.page,
        pageSize: 50,
      };
    });
  }
  inspect(
    actor: string,
    workspace: string,
    id: string,
    query: { kind: "resource" | "test" | "finding"; objectId: string },
  ) {
    return this.store.workspace(actor, workspace, async (client) => {
      const data = this.ready(await this.store.load(client, workspace, id));
      if (query.kind === "resource") {
        const resource = data.resources.find(
          (item) => item.id === query.objectId,
        );
        if (!resource) throw new WorkspaceAccessError();
        const relations = data.relations.filter(
          (edge) =>
            edge.sourceId === resource.id || edge.targetId === resource.id,
        );
        const neighbors = new Set(
          relations.flatMap((edge) => [edge.sourceId, edge.targetId]),
        );
        return {
          resource,
          relations: relations.slice(0, 500),
          resources: data.resources
            .filter((item) => neighbors.has(item.id))
            .slice(0, 100),
          truncated: relations.length > 500 || neighbors.size > 100,
        };
      }
      if (query.kind === "test") {
        const test = data.tests.find((item) => item.id === query.objectId);
        if (!test) throw new WorkspaceAccessError();
        return {
          test,
          links: data.testLinks
            .filter((item) => item.testId === test.id)
            .slice(0, 500),
        };
      }
      const finding = (await this.findings(client, id, data)).find(
        (item) => item.id === query.objectId,
      );
      if (!finding) throw new WorkspaceAccessError();
      return {
        finding,
        dependency:
          data.dependencies.find((dep) => dep.id === finding.dependencyId) ??
          null,
        canReview: await this.permissions(client, workspace, actor),
      };
    });
  }
  review(
    actor: string,
    workspace: string,
    id: string,
    input: z.infer<typeof reviewInputSchema>,
  ) {
    return this.store.workspace(
      actor,
      workspace,
      async (client) => {
        const data = this.ready(await this.store.load(client, workspace, id));
        if (!(await this.permissions(client, workspace, actor)))
          throw new RequestFailure(
            403,
            "FORBIDDEN",
            "Only administrators can review security findings",
          );
        if (!data.findings.some((item) => item.id === input.findingId))
          throw new WorkspaceAccessError();
        const recent = await client.query<{ count: string }>(
          "SELECT count(*) FROM quality_finding_events e JOIN analysis_quality_snapshots s ON s.id=e.snapshot_id WHERE s.organization_id=$1 AND e.created_at>now()-interval '1 minute'",
          [workspace],
        );
        if (Number(recent.rows[0].count) >= 60)
          throw new RequestFailure(
            429,
            "REVIEW_LIMIT",
            "Wait before submitting more reviews",
          );
        const previous = await client.query<ReviewRow>(
            "SELECT * FROM quality_finding_reviews WHERE snapshot_id=$1 AND finding_id=$2 FOR UPDATE",
            [id, input.findingId],
          ),
          before = previous.rows[0] ? review(previous.rows[0]) : null;
        if ((before?.revision ?? 0) !== input.revision)
          throw new RequestFailure(
            409,
            "REVIEW_CONFLICT",
            "This finding review changed. Refresh before saving",
          );
        const updated = await client.query<ReviewRow>(
          "INSERT INTO quality_finding_reviews(snapshot_id,finding_id,state,severity,reason,revision,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(snapshot_id,finding_id) DO UPDATE SET state=$3,severity=$4,reason=$5,revision=$6,actor_id=$7,updated_at=now() WHERE quality_finding_reviews.revision=$8 RETURNING *",
          [
            id,
            input.findingId,
            input.state,
            input.severity,
            input.reason,
            input.revision + 1,
            actor,
            input.revision,
          ],
        );
        if (!updated.rowCount)
          throw new RequestFailure(
            409,
            "REVIEW_CONFLICT",
            "This finding review changed. Refresh before saving",
          );
        const after = review(updated.rows[0]);
        await client.query(
          "INSERT INTO quality_finding_events(id,snapshot_id,finding_id,actor_id,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6)",
          [randomUUID(), id, input.findingId, actor, before, after],
        );
        await client.query(
          "INSERT INTO audit_events(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'quality.finding.reviewed',$4)",
          [
            randomUUID(),
            workspace,
            actor,
            `${id}:${input.findingId}:${after.revision}`,
          ],
        );
        return after;
      },
      true,
    );
  }
  audit(actor: string, workspace: string, id: string, page: number) {
    return this.store.workspace(actor, workspace, async (client) => {
      await this.store.load(client, workspace, id);
      const result = await client.query<{
        id: string;
        finding_id: string;
        actor_id: string;
        before_value: unknown;
        after_value: unknown;
        created_at: Date;
      }>(
        "SELECT * FROM quality_finding_events WHERE snapshot_id=$1 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",
        [id, (page - 1) * 50],
      );
      return {
        items: result.rows.map((row) => ({
          id: row.id,
          findingId: row.finding_id,
          actorId: row.actor_id,
          before:
            row.before_value === null
              ? null
              : findingReviewSchema.parse(row.before_value),
          after: findingReviewSchema.parse(row.after_value),
          createdAt: row.created_at.toISOString(),
        })),
        page,
        pageSize: 50,
      };
    });
  }
}
