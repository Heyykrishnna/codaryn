import { test } from "node:test";
import { strict as assert } from "node:assert";
import { exportArtifact } from "./exporter.js";
import { sanitizeExportContent } from "./sanitizer.js";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

const sampleSnapshot: AnalysisSnapshotInput = {
  jobId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  commitSha: "1234567890abcdef1234567890abcdef12345678",
  repositoryName: "acme/storefront",
  schema: {
    tables: [
      {
        name: "users",
        filePath: "schema.sql",
        startLine: 1,
        endLine: 20,
        columns: [
          { name: "id", dataType: "uuid", isPrimaryKey: true },
          { name: "email", dataType: "text" },
        ],
      },
    ],
    relations: [],
  },
  frontend: {
    components: [
      {
        id: "comp_home",
        name: "HomePage",
        filePath: "apps/web/pages/index.tsx",
        startLine: 1,
        endLine: 40,
        isPage: true,
      },
    ],
    routes: [],
    contexts: [],
    hooks: [],
    apiClients: [],
    connections: [],
  },
  backend: {
    routes: [
      {
        id: "route_1",
        method: "GET",
        path: "/api/health",
        filePath: "app.ts",
        startLine: 1,
        endLine: 10,
      },
    ],
    controllers: [],
    services: [],
    repositories: [],
    middleware: [],
    connections: [],
  },
};

test("exportArtifact produces valid SVG diagram artifact with correct MIME and hash", () => {
  const result = exportArtifact(
    {
      jobId: sampleSnapshot.jobId,
      exportType: "diagram",
      format: "svg",
      targetId: "system",
    },
    sampleSnapshot,
  );

  assert.equal(result.format, "svg");
  assert.equal(result.contentType, "image/svg+xml; charset=utf-8");
  assert.ok(result.filename.endsWith(".svg"));
  assert.ok(result.content.startsWith("<svg"));
  assert.ok(result.content.endsWith("</svg>"));
  assert.equal(result.hash.length, 64);
  assert.ok(result.size > 0);
});

test("exportArtifact produces valid DBML for database schemas", () => {
  const result = exportArtifact(
    {
      jobId: sampleSnapshot.jobId,
      exportType: "diagram",
      format: "dbml",
      targetId: "erd",
    },
    sampleSnapshot,
  );

  assert.equal(result.format, "dbml");
  assert.ok(result.filename.endsWith(".dbml"));
  assert.ok(result.content.includes("Table users {"));
  assert.ok(result.content.includes("id uuid [pk]"));
});

test("exportArtifact produces valid Markdown and HTML documentation artifacts", () => {
  const mdResult = exportArtifact(
    {
      jobId: sampleSnapshot.jobId,
      exportType: "document",
      format: "markdown",
      targetId: "overview",
    },
    sampleSnapshot,
  );

  assert.equal(mdResult.format, "markdown");
  assert.ok(mdResult.filename.endsWith(".md"));
  assert.ok(mdResult.content.includes("# Project Overview"));
  assert.ok(mdResult.content.includes(sampleSnapshot.commitSha));

  const pdfResult = exportArtifact(
    {
      jobId: sampleSnapshot.jobId,
      exportType: "document",
      format: "pdf",
      targetId: "overview",
    },
    sampleSnapshot,
  );

  assert.equal(pdfResult.format, "pdf");
  assert.ok(pdfResult.filename.endsWith(".html"));
  assert.ok(pdfResult.content.includes("<!DOCTYPE html>"));
});

test("sanitizeExportContent redacts secrets from exported content", () => {
  const sensitive = "API_KEY = ghp_1234567890abcdef1234567890abcdef1234";
  const sanitized = sanitizeExportContent(sensitive);
  assert.equal(sanitized.includes("ghp_"), false);
  assert.ok(sanitized.includes("[REDACTED_SECRET]"));
});
