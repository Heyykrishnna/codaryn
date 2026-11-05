import { useEffect, useState } from "react";
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
export function useExecutionResource<T>(
  url: string | null,
  schema: z.ZodType<T>,
) {
  const [state, setState] = useState<{
    url: string;
    data: T | null;
    error: string;
  }>({ url: "", data: null, error: "" });
  useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    fetch(url, {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "Execution data unavailable. Check access, wait for extraction or retry.",
          );
        const data = schema.parse(await response.json());
        if (!controller.signal.aborted) setState({ url, data, error: "" });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({
            url,
            data: null,
            error: "Execution data unavailable. Check access and retry.",
          });
      });
    return () => controller.abort();
  }, [url, schema]);
  return {
    data: state.url === url ? state.data : null,
    error: state.url === url ? state.error : "",
    loading: !!url && (state.url !== url || (!state.data && !state.error)),
  };
}
