import { test } from "node:test";
import { strict as assert } from "node:assert";
import { sanitizeExportContent, sanitizeFilename } from "./sanitizer.js";
import { exportArtifact } from "./exporter.js";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

const sensitiveSnapshot: AnalysisSnapshotInput = {
  jobId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  commitSha: "1234567890abcdef1234567890abcdef12345678",
  repositoryName: "acme/internal-service",
  schema: {
    tables: [
      {
        name: "credentials",
        filePath: "config.ts",
        startLine: 1,
        endLine: 20,
        columns: [
          { name: "id", dataType: "uuid", isPrimaryKey: true },
          { name: "api_key = \"ghp_abcdefghijklmnopqrstuvwxyz0123456789\"", dataType: "text" },
          { name: "conn = \"postgres://admin:superSecret123@db.prod.internal:5432/main\"", dataType: "text" },
        ],
      },
    ],
    relations: [],
  },
};

test("sanitizeExportContent redacts various token and credential patterns", () => {
  const ghToken = "ghp_123456789012345678901234567890123456";
  const fineGrained = "github_pat_11AAAAAAA0123456789012345678901234567890123456789012345678901234567890123456789012";
  const slackToken = "xoxb-1234567890-1234567890-abcdef";
  const awsKey = "AKIAIOSFODNN7EXAMPLE";
  const rsaKey = "-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Y...\n-----END RSA PRIVATE KEY-----";
  const dbUrl = "postgres://root:password999@10.0.0.5:5432/secrets";
  const bearer = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

  const payload = [
    `GH: ${ghToken}`,
    `PAT: ${fineGrained}`,
    `Slack: ${slackToken}`,
    `AWS: ${awsKey}`,
    `Key:\n${rsaKey}`,
    `Database: ${dbUrl}`,
    `Auth: ${bearer}`,
  ].join("\n");

  const sanitized = sanitizeExportContent(payload);

  assert.equal(sanitized.includes(ghToken), false);
  assert.equal(sanitized.includes(fineGrained), false);
  assert.equal(sanitized.includes(slackToken), false);
  assert.equal(sanitized.includes(awsKey), false);
  assert.equal(sanitized.includes(rsaKey), false);
  assert.equal(sanitized.includes("password999"), false);
  assert.equal(sanitized.includes(bearer), false);

  assert.ok(sanitized.includes("postgres://root:[REDACTED_PASSWORD]@10.0.0.5:5432/secrets"));
  assert.ok(sanitized.includes("[REDACTED_SECRET]"));
});

test("sanitizeFilename neutralizes path traversal, CRLF, and path separator injection", () => {
  const dangerous = "../../etc/passwd\r\nSet-Cookie: evil=true\0.svg";
  const clean = sanitizeFilename(dangerous);

  assert.equal(clean.includes("\r"), false);
  assert.equal(clean.includes("\n"), false);
  assert.equal(clean.includes("\0"), false);
  assert.equal(clean.includes("/"), false);
  assert.equal(clean.includes(".."), false);
  assert.ok(clean.length > 0);
});

test("exportArtifact pipeline strictly sanitizes sensitive database and secret tokens", () => {
  const result = exportArtifact(
    {
      jobId: sensitiveSnapshot.jobId,
      exportType: "diagram",
      format: "dbml",
      targetId: "erd",
    },
    sensitiveSnapshot,
  );

  assert.equal(result.content.includes("ghp_"), false);
  assert.equal(result.content.includes("superSecret123"), false);
  assert.ok(result.content.includes("[REDACTED_"));
  assert.ok(result.filename.startsWith("acme_internal-service_erd_"));
  assert.equal(result.filename.includes("/"), false);
});
