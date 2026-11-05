import { z } from "zod";
import {
  schemaSnapshotSummarySchema,
  schemaTableSchema,
  schemaRelationSchema,
  schemaLineageSchema,
  sourceEvidenceSchema,
} from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
export const snapshotsSchema = z.object({
  snapshots: z.array(schemaSnapshotSummarySchema),
  page: z.number(),
  pageSize: z.number(),
});
export const overviewSchema = z.object({
  snapshot: schemaSnapshotSummarySchema,
  tables: z.number(),
  columns: z.number(),
  relations: z.number(),
  enums: z.array(z.object({ name: z.string(), values: z.array(z.string()) })),
  diagnostics: z.array(
    z.object({
      code: z.string(),
      message: z.string(),
      evidence: sourceEvidenceSchema,
    }),
  ),
  diagnosticCount: z.number(),
});
export const diagramSchema = z.object({
  tables: z.array(schemaTableSchema),
  relations: z.array(schemaRelationSchema),
  truncated: z.boolean(),
});
export const tableDetailSchema = z.object({
  table: schemaTableSchema,
  relations: z.array(schemaRelationSchema),
  lineage: z.array(schemaLineageSchema),
  gaps: z.array(z.string()),
});
export const tableListSchema = z.object({
  items: z.array(
    schemaTableSchema
      .pick({
        id: true,
        name: true,
        namespace: true,
        adapter: true,
        domain: true,
        joinTable: true,
        evidence: true,
      })
      .extend({ columnCount: z.number() }),
  ),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export function schemaRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
  mutation = false,
) {
  return workspaceRequest(
    "schema",
    action,
    workspaceId,
    input,
    mutation,
    "Schema request failed. Check access and retry.",
  );
}
export async function downloadSchema(
  workspaceId: string,
  snapshotId: string,
  format: "json" | "svg" | "markdown",
  layout: "er" | "compact",
) {
  const query = new URLSearchParams({
    workspaceId,
    snapshotId,
    format,
    layout,
  });
  const response = await fetch(`/api/v1/schema/export?${query}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok)
    throw new Error(
      "Export unavailable. Large schemas support JSON and Markdown; wait for extraction to finish.",
    );
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `schema-${snapshotId}.${format === "markdown" ? "md" : format}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
