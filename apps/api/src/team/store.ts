import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  defaultWorkspaceControls,
  teamPermissions,
  workspaceControlsSchema,
} from "@codaryn/contracts";
import { WorkspaceAccessError } from "@codaryn/database";
import { RequestFailure } from "../http/access.js";
export type TeamContext = {
  client: PoolClient;
  role: "owner" | "admin" | "member";
  controls: ReturnType<typeof workspaceControlsSchema.parse>;
  permissions: ReturnType<typeof teamPermissions>;
};
export class TeamStore {
  constructor(readonly pool: Pool) {}
  async transaction<T>(
    actor: string,
    workspace: string,
    operation: (ctx: TeamContext) => Promise<T>,
    write = false,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (write)
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [`team:${workspace}`],
        );
      const members = await client.query<{
        role: "owner" | "admin" | "member";
      }>(
        "SELECT m.role FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE o.id=$1 AND m.user_id=$2 AND o.deleted_at IS NULL FOR SHARE OF m,o",
        [workspace, actor],
      );
      const role = members.rows[0]?.role;
      if (!role) throw new WorkspaceAccessError();
      const settings = await client.query<{
        revision: number;
        retention_days: number;
        retention_enabled: boolean;
        allow_member_sharing: boolean;
        allow_member_exports: boolean;
      }>(
        "SELECT * FROM workspace_controls WHERE organization_id=$1 FOR SHARE",
        [workspace],
      );
      const row = settings.rows[0],
        controls = workspaceControlsSchema.parse(
          row
            ? {
                revision: row.revision,
                retentionDays: row.retention_days,
                retentionEnabled: row.retention_enabled,
                allowMemberSharing: row.allow_member_sharing,
                allowMemberExports: row.allow_member_exports,
              }
            : defaultWorkspaceControls,
        );
      if (write) {
        const count = await client.query<{ count: string }>(
          "SELECT count(*) FROM audit_events WHERE organization_id=$1 AND action LIKE 'team.%' AND created_at>now()-interval '1 minute'",
          [workspace],
        );
        if (Number(count.rows[0].count) >= 60)
          throw new RequestFailure(
            429,
            "TEAM_LIMIT",
            "Wait before more collaboration requests",
          );
      }
      const result = await operation({
        client,
        role,
        controls,
        permissions: teamPermissions(role, controls),
      });
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
export async function auditTeam(
  client: PoolClient,
  workspace: string,
  actor: string,
  action: string,
  target: string,
  metric?:
    | "share-created"
    | "share-opened"
    | "download-issued"
    | "download-used"
    | "retention-deleted",
  count = 1,
) {
  await client.query(
    "INSERT INTO audit_events(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,$4,$5)",
    [randomUUID(), workspace, actor, `team.${action}`, target],
  );
  if (metric)
    await client.query(
      "INSERT INTO workspace_usage_daily(organization_id,metric,count) VALUES($1,$2,$3) ON CONFLICT(organization_id,day,metric) DO UPDATE SET count=workspace_usage_daily.count+$3",
      [workspace, metric, count],
    );
}
export function requireCapability(allowed: boolean) {
  if (!allowed)
    throw new RequestFailure(
      403,
      "FORBIDDEN",
      "This action is not permitted by your workspace role or controls",
    );
}
