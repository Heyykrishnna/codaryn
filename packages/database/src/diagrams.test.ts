import { test } from "node:test";
import { strict as assert } from "node:assert";
import { getTableConfig } from "drizzle-orm/pg-core";
import {
  savedDiagramLayouts,
  analysisGeneratedDocuments,
  exportJobs,
  exportArtifacts,
} from "./schema.js";

test("diagram and documentation tables have primary keys and required constraints", () => {
  const layoutConfig = getTableConfig(savedDiagramLayouts);
  assert.equal(layoutConfig.name, "saved_diagram_layouts");
  assert.ok(layoutConfig.columns.some((c) => c.name === "layout_config"));
  assert.ok(layoutConfig.foreignKeys.length >= 4);

  const docConfig = getTableConfig(analysisGeneratedDocuments);
  assert.equal(docConfig.name, "analysis_generated_documents");
  assert.ok(docConfig.columns.some((c) => c.name === "content_markdown"));
  assert.ok(docConfig.foreignKeys.length >= 3);

  const exportConfig = getTableConfig(exportJobs);
  assert.equal(exportConfig.name, "export_jobs");
  assert.ok(exportConfig.columns.some((c) => c.name === "artifact_hash"));
  assert.ok(exportConfig.foreignKeys.length >= 4);

  const artifactConfig = getTableConfig(exportArtifacts);
  assert.equal(artifactConfig.name, "export_artifacts");
  assert.ok(artifactConfig.columns.some((c) => c.name === "payload"));
  assert.ok(artifactConfig.foreignKeys.length >= 2);
});
