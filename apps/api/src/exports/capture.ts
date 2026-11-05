import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import {
  diagramLayoutConfigSchema,
  diagramTypeSchema,
  documentTemplateIdSchema,
  frozenExportSchema,
  type ExportRequest,
} from "@codaryn/contracts";
import { exportArtifact } from "@codaryn/export-engine";
import { DiagramService } from "../diagrams/service.js";
import { RequestFailure } from "../http/access.js";
export async function captureExport(
  client: PoolClient,
  diagrams: DiagramService,
  workspace: string,
  jobId: string,
  input: ExportRequest,
) {
  if (input.jobId !== jobId)
    throw new RequestFailure(
      400,
      "EXPORT_SCOPE",
      "Export job must match the selected analysis",
    );
  if (input.exportType === "diagram") diagramTypeSchema.parse(input.targetId);
  if (input.exportType === "document")
    documentTemplateIdSchema.parse(input.targetId);
  const snapshot = await diagrams.loadSnapshot(client, workspace, jobId);
  const layouts = await client.query<{ layout_config: unknown }>(
    "SELECT layout_config FROM saved_diagram_layouts WHERE organization_id=$1 AND job_id=$2 AND ($3::uuid IS NULL OR id=$3) AND diagram_type=$4 ORDER BY updated_at DESC,id LIMIT 1",
    [workspace, jobId, input.layoutId ?? null, input.targetId],
  );
  if (input.layoutId && !layouts.rowCount)
    throw new RequestFailure(404, "NOT_FOUND", "Saved view not found");
  const layout = layouts.rows[0]
    ? diagramLayoutConfigSchema.parse(layouts.rows[0].layout_config)
    : undefined;
  const artifact = exportArtifact(input, snapshot, layout);
  if (artifact.size > 20 * 1024 * 1024)
    throw new RequestFailure(
      422,
      "EXPORT_LIMIT",
      "Export exceeds supported size",
    );
  const frozen = frozenExportSchema.parse({
    version: 1,
    jobId,
    commitSha: snapshot.commitSha,
    artifact,
  });
  if (
    createHash("sha256").update(frozen.artifact.content).digest("hex") !==
      frozen.artifact.hash ||
    Buffer.byteLength(frozen.artifact.content) !== frozen.artifact.size
  )
    throw new Error("Invalid export checksum");
  return frozen;
}
