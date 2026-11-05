import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  documentSearchQuerySchema,
  documentTemplateIdSchema,
  exportFormatSchema,
  exportJobResponseSchema,
  exportRequestSchema,
  generatedDocumentSchema,
} from "./documentation.js";

test("document template id schema accepts supported templates", () => {
  const templates = [
    "overview",
    "architecture",
    "frontend",
    "backend",
    "api",
    "schema",
    "dependencies",
    "execution",
    "infrastructure",
    "security",
  ];
  for (const template of templates) {
    assert.equal(documentTemplateIdSchema.safeParse(template).success, true);
  }
  assert.equal(documentTemplateIdSchema.safeParse("unknown").success, false);
});

test("generated document schema validates full document structure and metadata", () => {
  const valid = {
    id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    templateId: "overview" as const,
    title: "System Overview",
    version: 1,
    jobId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    commitSha: "b".repeat(40),
    sections: [
      {
        id: "intro",
        title: "Introduction",
        level: 1,
        content: "Overview of the application stack.",
        evidence: [],
      },
    ],
    markdown: "# System Overview\n\nOverview of the application stack.",
    metadata: {
      generatedAt: "2026-11-05T12:00:00.000Z",
      analyzerVersion: "1.0.0",
      commitSha: "b".repeat(40),
      repositoryName: "acme/storefront",
      wordCount: 8,
      evidenceCount: 0,
      uncertaintyCount: 0,
    },
  };
  assert.equal(generatedDocumentSchema.safeParse(valid).success, true);
});

test("document search query schema validates length limits", () => {
  assert.equal(
    documentSearchQuerySchema.safeParse({ query: "auth", limit: 10 }).success,
    true,
  );
  assert.equal(documentSearchQuerySchema.safeParse({ query: "" }).success, false);
  assert.equal(
    documentSearchQuerySchema.safeParse({ query: "x".repeat(101) }).success,
    false,
  );
});

test("export schemas validate export request and job response formats", () => {
  const formats = [
    "svg",
    "png",
    "pdf",
    "markdown",
    "mermaid",
    "dbml",
    "json",
  ];
  for (const format of formats) {
    assert.equal(exportFormatSchema.safeParse(format).success, true);
  }
  assert.equal(exportFormatSchema.safeParse("docx").success, false);

  const request = {
    jobId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    exportType: "diagram" as const,
    format: "svg" as const,
    targetId: "system",
  };
  assert.equal(exportRequestSchema.safeParse(request).success, true);

  const response = {
    id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    jobId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    exportType: "diagram" as const,
    format: "svg" as const,
    targetId: "system",
    status: "completed" as const,
    artifactSize: 2048,
    artifactHash: "c".repeat(64),
    createdAt: "2026-11-05T12:00:00.000Z",
    completedAt: "2026-11-05T12:00:02.000Z",
  };
  assert.equal(exportJobResponseSchema.safeParse(response).success, true);
});
