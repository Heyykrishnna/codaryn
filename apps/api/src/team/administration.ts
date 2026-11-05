import { workspaceControlsSchema } from "@codaryn/contracts";
import { RequestFailure } from "../http/access.js";
import { TeamStore, auditTeam, requireCapability } from "./store.js";
export class AdministrationService {
  constructor(readonly store: TeamStore) {}
  overview(actor: string, workspace: string) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, role, controls, permissions }) => {
        const counts = await client.query<{
          members: string;
          repositories: string;
          jobs: string;
          exports: string;
          bytes: string;
        }>(
          "SELECT (SELECT count(*) FROM organization_members WHERE organization_id=$1) members,(SELECT count(*) FROM github_installations i JOIN connected_repositories r ON r.installation_id=i.id WHERE i.organization_id=$1 AND r.active=true) repositories,(SELECT count(*) FROM analysis_jobs WHERE organization_id=$1) jobs,(SELECT count(*) FROM export_jobs WHERE organization_id=$1) exports,(SELECT COALESCE(sum(size),0) FROM export_artifacts WHERE organization_id=$1) bytes",
          [workspace],
        );
        return {
          actorId: actor,
          role,
          controls,
          permissions,
          counts: Object.fromEntries(
            Object.entries(counts.rows[0]).map(([key, value]) => [
              key,
              Number(value),
            ]),
          ),
        };
      },
    );
  }
  configure(
    actor: string,
    workspace: string,
    input: ReturnType<typeof workspaceControlsSchema.parse>,
  ) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, permissions, controls }) => {
        requireCapability(permissions.manageWorkspace);
        if (input.revision !== controls.revision)
          throw new RequestFailure(
            409,
            "REVISION_CONFLICT",
            "Workspace controls changed; refresh before saving",
          );
        const result = await client.query(
          "INSERT INTO workspace_controls(organization_id,revision,retention_days,retention_enabled,allow_member_sharing,allow_member_exports) VALUES($1,$2+1,$3,$4,$5,$6) ON CONFLICT(organization_id) DO UPDATE SET revision=$2+1,retention_days=$3,retention_enabled=$4,allow_member_sharing=$5,allow_member_exports=$6,updated_at=now() WHERE workspace_controls.revision=$2 RETURNING revision",
          [
            workspace,
            input.revision,
            input.retentionDays,
            input.retentionEnabled,
            input.allowMemberSharing,
            input.allowMemberExports,
          ],
        );
        if (!result.rowCount)
          throw new RequestFailure(
            409,
            "REVISION_CONFLICT",
            "Workspace controls changed; refresh before saving",
          );
        await auditTeam(
          client,
          workspace,
          actor,
          "controls.updated",
          workspace,
        );
        return { revision: input.revision + 1 };
      },
      true,
    );
  }
  activity(actor: string, workspace: string, page: number) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, permissions }) => {
        const result = await client.query<{
          id: string;
          actor_id: string;
          action: string;
          target_id: string;
          created_at: Date;
        }>(
          "SELECT id,actor_id,action,target_id,created_at FROM audit_events WHERE organization_id=$1 AND ($2 OR actor_id=$3) ORDER BY created_at DESC,id LIMIT 50 OFFSET $4",
          [workspace, permissions.viewAudit, actor, (page - 1) * 50],
        );
        return {
          items: result.rows.map((row) => ({
            id: row.id,
            actorId: row.actor_id,
            action: row.action,
            targetId: row.target_id,
            createdAt: row.created_at.toISOString(),
          })),
          page,
          pageSize: 50,
        };
      },
    );
  }
  usage(actor: string, workspace: string) {
    return this.store.transaction(actor, workspace, async ({ client }) => {
      const result = await client.query<{
        day: string;
        metric: string;
        count: number;
      }>(
        "SELECT day::text,metric,count FROM workspace_usage_daily WHERE organization_id=$1 AND day>=CURRENT_DATE-89 ORDER BY day DESC,metric LIMIT 450",
        [workspace],
      );
      return { items: result.rows, windowDays: 90 };
    });
  }
  members(actor: string, workspace: string, page: number) {
    return this.store.transaction(actor, workspace, async ({ client }) => {
      const result = await client.query<{ user_id: string; role: string }>(
        "SELECT user_id,role FROM organization_members WHERE organization_id=$1 ORDER BY created_at,user_id LIMIT 50 OFFSET $2",
        [workspace, (page - 1) * 50],
      );
      return {
        items: result.rows.map((row) => ({
          userId: row.user_id,
          role: row.role,
        })),
        page,
        pageSize: 50,
      };
    });
  }
  catalog(
    actor: string,
    workspace: string,
    kind: "versions" | "views" | "exports" | "presets",
    page: number,
  ) {
    return this.store.transaction(actor, workspace, async ({ client }) => {
      const queries = {
        versions:
          "SELECT id,job_id,commit_sha,status,hash,created_at FROM analysis_version_snapshots WHERE organization_id=$1 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",
        views:
          "SELECT id,job_id,diagram_type,name,created_at FROM saved_diagram_layouts WHERE organization_id=$1 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",
        exports:
          "SELECT id,job_id,export_type,format,target_id,status,artifact_size,artifact_hash,created_at FROM export_jobs WHERE organization_id=$1 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",
        presets:
          "SELECT id,name,revision,created_at FROM analysis_profiles WHERE organization_id=$1 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",
      };
      const rows = await client.query<Record<string, unknown>>(queries[kind], [
        workspace,
        (page - 1) * 50,
      ]);
      return { items: rows.rows, page, pageSize: 50 };
    });
  }
}
