import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { RequestFailure } from "../http/access.js";
import { TeamStore, auditTeam, requireCapability } from "./store.js";
const tables = {
  schema: "analysis_schema_snapshots",
  execution: "analysis_execution_snapshots",
  quality: "analysis_quality_snapshots",
  version: "analysis_version_snapshots",
  export: "export_jobs",
} as const;
type Candidate = { kind: keyof typeof tables; id: string };
export class RetentionService {
  constructor(readonly store: TeamStore) {}
  private async candidates(
    client: PoolClient,
    workspace: string,
    days: number,
    lock: boolean,
  ) {
    const items: Candidate[] = [];
    for (const [kind, table] of Object.entries(tables)) {
      const base =
        "s.organization_id=$1 AND s.created_at<now()-($2::int*interval '1 day') AND s.status IN ('completed','failed')";
      const protection =
        kind === "export"
          ? "NOT EXISTS(SELECT 1 FROM export_download_grants g WHERE g.export_id=s.id AND g.revoked_at IS NULL AND g.used_at IS NULL AND g.expires_at>now())"
          : `(s.status='failed' OR EXISTS(SELECT 1 FROM ${table} n WHERE n.organization_id=s.organization_id AND n.repository_id=s.repository_id AND n.status='completed' AND (n.created_at,n.id)>(s.created_at,s.id)))`;
      const version =
        kind === "version"
          ? "AND NOT EXISTS(SELECT 1 FROM analysis_version_snapshots b WHERE b.base_snapshot_id=s.id) AND NOT EXISTS(SELECT 1 FROM architecture_comparisons c WHERE c.from_id=s.id OR c.to_id=s.id) AND NOT EXISTS(SELECT 1 FROM resource_shares v WHERE v.resource_kind='version' AND v.resource_id=s.id AND v.revoked_at IS NULL AND v.expires_at>now())"
          : "";
      const rows = await client.query<{ id: string }>(
        `SELECT s.id FROM ${table} s WHERE ${base} AND ${protection} ${version} ORDER BY s.created_at,s.id LIMIT 25 ${lock ? "FOR UPDATE OF s SKIP LOCKED" : ""}`,
        [workspace, days],
      );
      for (const row of rows.rows) {
        const key = (Object.keys(tables) as (keyof typeof tables)[]).find(
          (key) => key === kind,
        );
        if (key) items.push({ kind: key, id: row.id });
      }
    }
    return items;
  }
  preview(actor: string, workspace: string) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, controls, permissions }) => {
        requireCapability(permissions.applyRetention);
        const candidates = controls.retentionEnabled
          ? await this.candidates(
              client,
              workspace,
              controls.retentionDays,
              false,
            )
          : [];
        return {
          revision: controls.revision,
          candidates,
          hash: createHash("sha256")
            .update(JSON.stringify([controls.revision, candidates]))
            .digest("hex"),
        };
      },
    );
  }
  apply(actor: string, workspace: string, revision: number, hash: string) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, controls, permissions }) => {
        requireCapability(permissions.applyRetention);
        if (!controls.retentionEnabled || controls.revision !== revision)
          throw new RequestFailure(
            409,
            "RETENTION_CHANGED",
            "Refresh the retention preview before applying",
          );
        const candidates = await this.candidates(
            client,
            workspace,
            controls.retentionDays,
            true,
          ),
          expected = createHash("sha256")
            .update(JSON.stringify([revision, candidates]))
            .digest("hex");
        if (expected !== hash)
          throw new RequestFailure(
            409,
            "RETENTION_CHANGED",
            "Eligible data changed; refresh before applying",
          );
        for (const candidate of candidates)
          await client.query(
            `DELETE FROM ${tables[candidate.kind]} WHERE id=$1 AND organization_id=$2`,
            [candidate.id, workspace],
          );
        await auditTeam(
          client,
          workspace,
          actor,
          "retention.applied",
          String(candidates.length),
          "retention-deleted",
          candidates.length,
        );
        return { deleted: candidates.length };
      },
      true,
    );
  }
}
