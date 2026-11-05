import { z } from "zod";
import { workspaceControlsSchema } from "@codaryn/contracts";
export { useArtifactResource } from "@/src/lib/artifact-resource";
export function teamUrl(
  action: string,
  workspaceId: string,
  input: Record<string, string | number> = {},
) {
  return `/api/v1/team/${action}?${new URLSearchParams({ workspaceId, ...Object.fromEntries(Object.entries(input).map(([k, v]) => [k, String(v)])) })}`;
}
export const overviewSchema = z.object({
  actorId: z.string(),
  role: z.enum(["owner", "admin", "member"]),
  controls: workspaceControlsSchema,
  permissions: z.object({
    manageWorkspace: z.boolean(),
    manageMembers: z.boolean(),
    managePresets: z.boolean(),
    shareAnalysis: z.boolean(),
    exportAnalysis: z.boolean(),
    applyRetention: z.boolean(),
    viewAudit: z.boolean(),
  }),
  counts: z.record(z.string(), z.number()),
});
const page = { page: z.number(), pageSize: z.number() };
export const membersSchema = z.object({
  ...page,
  items: z.array(
    z.object({
      userId: z.string(),
      role: z.enum(["owner", "admin", "member"]),
    }),
  ),
});
export const catalogSchema = z.object({
  ...page,
  items: z.array(
    z.object({
      id: z.uuid(),
      job_id: z.uuid().optional(),
      commit_sha: z.string().optional(),
      status: z.string().optional(),
      name: z.string().optional(),
      diagram_type: z.string().optional(),
      export_type: z.string().optional(),
      format: z.string().optional(),
      target_id: z.string().optional(),
      revision: z.number().optional(),
      artifact_size: z.number().nullable().optional(),
      created_at: z.string(),
    }),
  ),
});
export const sharesSchema = z.object({
  ...page,
  items: z.array(
    z.object({
      id: z.uuid(),
      resource_kind: z.string(),
      resource_id: z.uuid(),
      recipient_id: z.string(),
      actor_id: z.string(),
      expires_at: z.string(),
      revoked_at: z.string().nullable(),
    }),
  ),
});
export const activitySchema = z.object({
  ...page,
  items: z.array(
    z.object({
      id: z.uuid(),
      actorId: z.string(),
      action: z.string(),
      targetId: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
});
export const usageSchema = z.object({
  items: z.array(
    z.object({ day: z.string(), metric: z.string(), count: z.number() }),
  ),
  windowDays: z.number(),
});
export const linkSchema = z.object({
  id: z.uuid(),
  url: z.string().startsWith("/"),
  expiresAt: z.string(),
});
