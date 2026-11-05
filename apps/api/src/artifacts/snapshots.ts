import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { WorkspaceAccessError } from "@codaryn/database";
import { RequestFailure } from "../http/access.js";
import { artifactWorkspace } from "./access.js";
export interface ArtifactRow {
  id: string;
  job_id: string;
  repository_id: string;
  commit_sha: string;
  status: string;
  hash: string | null;
  object_count: number;
  failure_code: string | null;
  created_at: Date;
  snapshot: unknown;
}
const tables = {
  schema: "analysis_schema_snapshots",
  execution: "analysis_execution_snapshots",
  quality: "analysis_quality_snapshots",
  version: "analysis_version_snapshots",
} as const;
const counts = {
  schema: "table_count",
  execution: "function_count",
  quality: "finding_count",
  version: "file_count",
} as const;
export class ArtifactSnapshots {
  constructor(
    private readonly pool: Pool,
    private readonly kind: "schema" | "execution" | "quality" | "version",
  ) {}
  workspace<T>(
    actor: string,
    workspace: string,
    operation: (client: PoolClient) => Promise<T>,
    write = false,
  ) {
    return artifactWorkspace(
      this.pool,
      this.kind,
      actor,
      workspace,
      operation,
      write,
    );
  }
  jobs(actor: string, workspace: string) {
    return this.workspace(actor, workspace, async (client) => {
      const rows = await client.query<{
        id: string;
        commit_sha: string;
        full_name: string;
        ref: string;
      }>(
        "SELECT j.id,j.commit_sha,r.full_name,j.ref FROM analysis_jobs j JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id WHERE j.organization_id=$1 AND i.organization_id=$1 AND i.connected=true AND r.active=true AND j.status<>'cancelled' ORDER BY j.created_at DESC,j.id LIMIT 20",
        [workspace],
      );
      return { jobs: rows.rows };
    });
  }
  async load(client: PoolClient, workspace: string, id: string) {
    const result = await client.query<ArtifactRow>(
      `SELECT *,${counts[this.kind]} AS object_count FROM ${tables[this.kind]} WHERE id=$1 AND organization_id=$2`,
      [id, workspace],
    );
    const row = result.rows[0];
    if (!row) throw new WorkspaceAccessError();
    return row;
  }
  request(
    actor: string,
    workspace: string,
    jobId: string,
    infer = false,
    baseId: string | null = null,
  ) {
    return this.workspace(
      actor,
      workspace,
      async (client) => {
        const table = tables[this.kind];
        if (this.kind === "quality" && infer) {
          const roles = await client.query<{ role: string }>(
            "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR SHARE",
            [workspace, actor],
          );
          if (!["owner", "admin"].includes(roles.rows[0]?.role ?? ""))
            throw new RequestFailure(
              403,
              "FORBIDDEN",
              "An administrator must authorize external dependency scans",
            );
        }
        const recent = await client.query<{ count: string }>(
          `SELECT count(*) FROM ${table} WHERE organization_id=$1 AND created_at>now()-interval '1 minute'`,
          [workspace],
        );
        if (Number(recent.rows[0].count) >= 5)
          throw new RequestFailure(
            429,
            {
              schema: "SCHEMA_LIMIT",
              execution: "EXECUTION_LIMIT",
              quality: "QUALITY_LIMIT",
              version: "VERSION_LIMIT",
            }[this.kind],
            "Wait before requesting more snapshots",
          );
        const jobs = await client.query<{
          repository_id: string;
          commit_sha: string;
          generation: number;
        }>(
          "SELECT j.repository_id,j.commit_sha,i.generation FROM analysis_jobs j JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id WHERE j.id=$1 AND j.organization_id=$2 AND i.organization_id=$2 AND j.status<>'cancelled' AND r.active=true AND i.connected=true FOR SHARE OF j,r,i",
          [jobId, workspace],
        );
        const job = jobs.rows[0];
        if (!job) throw new WorkspaceAccessError();
        const id = randomUUID();
        const extra =
            this.kind === "schema"
              ? ",infer_relations"
              : this.kind === "quality"
                ? ",external_scans"
                : this.kind === "version"
                  ? ",verify_full,base_snapshot_id"
                  : "",
          value =
            this.kind === "version"
              ? ",$8,$9"
              : this.kind !== "execution"
                ? ",$8"
                : "";
        const parameters: unknown[] = [
          id,
          jobId,
          workspace,
          job.repository_id,
          actor,
          job.commit_sha,
          job.generation,
        ];
        if (this.kind !== "execution") parameters.push(infer);
        if (this.kind === "version") {
          if (baseId) {
            const base = await client.query(
              "SELECT id FROM analysis_version_snapshots WHERE id=$1 AND organization_id=$2 AND repository_id=$3 AND status='completed'",
              [baseId, workspace, job.repository_id],
            );
            if (!base.rowCount) throw new WorkspaceAccessError();
          }
          parameters.push(baseId);
        }
        const result = await client.query<ArtifactRow>(
          `INSERT INTO ${table} (id,job_id,organization_id,repository_id,actor_id,commit_sha,installation_generation${extra}) VALUES ($1,$2,$3,$4,$5,$6,$7${value}) RETURNING *,${counts[this.kind]} AS object_count`,
          parameters,
        );
        await client.query(
          "INSERT INTO audit_events (id,organization_id,actor_id,action,target_id) VALUES ($1,$2,$3,$4,$5)",
          [
            randomUUID(),
            workspace,
            actor,
            `${this.kind}.snapshot.requested`,
            id,
          ],
        );
        return result.rows[0];
      },
      true,
    );
  }
  list(actor: string, workspace: string, page: number, jobId?: string) {
    return this.workspace(actor, workspace, async (client) => {
      const result = await client.query<ArtifactRow>(
        `SELECT id,job_id,repository_id,commit_sha,status,hash,${counts[this.kind]} AS object_count,failure_code,created_at FROM ${tables[this.kind]} WHERE organization_id=$1 AND ($2::uuid IS NULL OR job_id=$2) ORDER BY created_at DESC,id LIMIT 20 OFFSET $3`,
        [workspace, jobId ?? null, (page - 1) * 20],
      );
      return result.rows;
    });
  }
}
