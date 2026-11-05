import { z } from "zod";
import { exportFormatSchema, exportTypeSchema } from "./documentation.js";
export const workspaceControlsSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  retentionDays: z.number().int().min(7).max(3650),
  retentionEnabled: z.boolean(),
  allowMemberSharing: z.boolean(),
  allowMemberExports: z.boolean(),
});
export const defaultWorkspaceControls = {
  revision: 0,
  retentionDays: 90,
  retentionEnabled: false,
  allowMemberSharing: false,
  allowMemberExports: true,
} as const;
export function teamPermissions(
  role: "owner" | "admin" | "member",
  controls: z.infer<typeof workspaceControlsSchema>,
) {
  const admin = role !== "member";
  return {
    manageWorkspace: admin,
    manageMembers: role === "owner",
    managePresets: admin,
    shareAnalysis: admin || controls.allowMemberSharing,
    exportAnalysis: admin || controls.allowMemberExports,
    applyRetention: admin,
    viewAudit: admin,
  };
}
const label = z.string().max(512),
  hash = z.string().regex(/^[a-f0-9]{64}$/);
export const sharedProjectionSchema = z.strictObject({
  kind: z.enum(["version", "diagram"]),
  jobId: z.uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  name: label,
  hash,
  nodes: z
    .array(z.strictObject({ id: z.string().max(1024), label, kind: label }))
    .max(200),
  edges: z
    .array(
      z.strictObject({
        source: z.string().max(1024),
        target: z.string().max(1024),
        kind: label,
      }),
    )
    .max(500),
  truncated: z.boolean(),
});
export const frozenExportSchema = z.strictObject({
  version: z.literal(1),
  jobId: z.uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  artifact: z.strictObject({
    filename: z.string().max(256),
    contentType: z.enum([
      "image/svg+xml; charset=utf-8",
      "text/markdown; charset=utf-8",
      "text/plain; charset=utf-8",
      "text/vnd.mermaid; charset=utf-8",
      "text/vnd.dbml; charset=utf-8",
      "application/json; charset=utf-8",
      "text/html; charset=utf-8",
    ]),
    content: z.string().max(20971520),
    size: z.number().int().nonnegative().max(20971520),
    hash,
    format: exportFormatSchema,
    exportType: exportTypeSchema,
  }),
});
export const retentionPreviewSchema = z.object({
  hash,
  revision: z.number().int(),
  candidates: z
    .array(
      z.object({
        kind: z.enum(["schema", "execution", "quality", "version", "export"]),
        id: z.uuid(),
      }),
    )
    .max(125),
});
