import { z } from "zod";
import {
  executionSnapshotSummarySchema,
  executionFunctionSchema,
  executionCallSchema,
  executionEntrySchema,
  executionDiagnosticSchema,
  executionControlNodeSchema,
  executionControlEdgeSchema,
  executionValueSchema,
  executionFlowSchema,
  executionPathSchema,
} from "@codaryn/contracts";
export const summariesSchema = z.object({
  snapshots: z.array(executionSnapshotSummarySchema),
  page: z.number(),
  pageSize: z.number(),
});
export const jobsSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.uuid(),
      commit_sha: z.string(),
      full_name: z.string(),
      ref: z.string(),
    }),
  ),
});
export const overviewSchema = z.object({
  snapshot: executionSnapshotSummarySchema,
  semantics: z.literal("potential-static"),
  functions: z.number(),
  calls: z.number(),
  unresolved: z.number(),
  entries: z.number(),
  diagnostics: z.array(executionDiagnosticSchema),
  diagnosticCount: z.number(),
});
const page = { total: z.number(), page: z.number(), pageSize: z.number() };
export const functionsSchema = z.object({
  ...page,
  items: z.array(executionFunctionSchema),
});
export const callsSchema = z.object({
  ...page,
  items: z.array(executionCallSchema),
});
export const entriesSchema = z.object({
  ...page,
  items: z.array(executionEntrySchema),
});
export const detailSchema = z.object({
  function: executionFunctionSchema,
  calls: z.array(executionCallSchema),
  controlNodes: z.array(executionControlNodeSchema),
  controlEdges: z.array(executionControlEdgeSchema),
  values: z.array(executionValueSchema),
  flows: z.array(executionFlowSchema),
  truncated: z.boolean(),
  semantics: z.literal("potential-static"),
});
export const neighborhoodSchema = z.object({
  functions: z.array(executionFunctionSchema),
  calls: z.array(executionCallSchema),
  truncated: z.boolean(),
});
export const pathsSchema = executionPathSchema.extend({
  functions: z.array(executionFunctionSchema),
});
export function executionUrl(
  action: string,
  workspaceId: string,
  input: Record<string, string | number>,
) {
  return `/api/v1/execution/${action}?${new URLSearchParams({ workspaceId, ...Object.fromEntries(Object.entries(input).map(([key, value]) => [key, String(value)])) })}`;
}
export { useArtifactResource as useExecutionResource } from "@/src/lib/artifact-resource";
