import { z } from "zod";
import {
  versionSummarySchema,
  versionSnapshotSchema,
  architectureChangeSchema,
  impactSchema,
} from "@codaryn/contracts";
export { jobsSchema } from "@/src/features/execution-explorer/api";
export { useArtifactResource } from "@/src/lib/artifact-resource";
export function comparisonUrl(
  action: string,
  workspaceId: string,
  input: Record<string, string | number> = {},
) {
  return `/api/v1/comparison/${action}?${new URLSearchParams({ workspaceId, ...Object.fromEntries(Object.entries(input).map(([k, v]) => [k, String(v)])) })}`;
}
export const versionsSchema = z.object({
  snapshots: z.array(versionSummarySchema),
  page: z.number(),
  pageSize: z.number(),
});
export const overviewSchema = z.object({
  snapshot: versionSummarySchema,
  reuse: versionSnapshotSchema.shape.reuse.nullable(),
  analyzer: z.string().nullable(),
  contentHash: z.string().nullable(),
  symbols: z.number(),
  relationships: z.number(),
  schemaObjects: z.number(),
  diagnostics: z.number(),
});
export const historySchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      fromId: z.uuid(),
      toId: z.uuid(),
      hash: z.string(),
      createdAt: z.string(),
    }),
  ),
  page: z.number(),
  pageSize: z.number(),
});
export const detailSchema = z.object({
  id: z.uuid(),
  hash: z.string(),
  fromId: z.uuid(),
  toId: z.uuid(),
  items: z.array(z.union([architectureChangeSchema, impactSchema])),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  drift: z.array(z.string()),
  truncated: z.boolean(),
  semantics: z.literal("potential-static"),
});
export const policySchema = z.object({
  items: z.array(
    z.object({ repositoryId: z.uuid(), ref: z.string(), enabled: z.boolean() }),
  ),
  canManage: z.boolean(),
});
export const comparisonCreatedSchema = z.object({
  id: z.uuid(),
  hash: z.string(),
});
