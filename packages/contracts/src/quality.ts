import { z } from "zod";
import { sourceEvidenceSchema } from "./evidence.js";
const id = z.string().min(1).max(1024);
export const findingSeveritySchema = z.enum([
  "critical",
  "high",
  "medium",
  "low",
  "info",
  "unknown",
]);
export const findingStateSchema = z.enum([
  "open",
  "confirmed",
  "false-positive",
  "resolved",
]);
export const findingReasonSchema = z.enum([
  "needs-review",
  "verified",
  "not-applicable",
  "accepted-risk",
  "remediated",
]);
export const qualityResourceSchema = z.object({
  id,
  name: z.string().max(512),
  kind: z.enum([
    "docker-stage",
    "service",
    "volume",
    "network",
    "workflow-job",
  ]),
  details: z.array(z.string().max(512)).max(30),
  evidence: sourceEvidenceSchema,
});
export const qualityRelationSchema = z.object({
  id,
  sourceId: id,
  targetId: id,
  kind: z.enum(["depends-on", "builds", "mounts", "uses"]),
  evidence: sourceEvidenceSchema,
});
export const environmentReferenceSchema = z.object({
  id,
  name: z.string().max(256),
  source: z.enum(["example", "reference", "configuration"]),
  evidence: sourceEvidenceSchema,
});
export const qualityTestSchema = z.object({
  id,
  name: z.string().max(512),
  framework: z.enum(["vitest", "jest", "unknown"]),
  mode: z.enum(["normal", "skip", "only", "todo"]),
  parameterized: z.boolean(),
  evidence: sourceEvidenceSchema,
});
export const testSymbolLinkSchema = z.object({
  id,
  testId: id,
  symbolId: id,
  symbolName: z.string().max(512),
  kind: z.enum(["calls", "references"]),
  evidence: sourceEvidenceSchema,
  targetEvidence: sourceEvidenceSchema,
});
export const qualityCoverageSchema = z
  .object({
    id,
    path: z.string(),
    format: z.enum(["lcov", "istanbul"]),
    metric: z.enum(["lines", "statements"]),
    covered: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    reportEvidence: sourceEvidenceSchema,
  })
  .refine((value) => value.covered <= value.total, {
    message: "Covered lines cannot exceed total",
  });
export const qualityDependencySchema = z.object({
  id,
  name: z.string().max(256),
  version: z.string().max(160),
  ecosystem: z.literal("npm"),
  provenance: z.enum(["declared", "resolved"]),
  dev: z.boolean(),
  evidence: sourceEvidenceSchema,
});
export const qualityFindingSchema = z.object({
  id,
  ruleId: z.string().max(200),
  tool: z.enum(["builtin", "semgrep", "osv"]),
  category: z.enum(["secret", "dangerous-code", "configuration", "dependency"]),
  title: z.string().max(512),
  description: z.string().max(1000),
  severity: findingSeveritySchema,
  confidence: z.enum(["high", "medium", "low"]),
  evidence: sourceEvidenceSchema,
  dependencyId: id.nullable(),
});
export const scannerStatusSchema = z.object({
  tool: z.enum(["builtin", "semgrep", "osv"]),
  status: z.enum(["completed", "partial", "disabled", "unavailable", "failed"]),
  message: z.string().max(512),
  checkedAt: z.iso.datetime().nullable(),
  version: z.string().max(100),
});
export const qualityDiagnosticSchema = z.object({
  code: z.string(),
  message: z.string(),
  evidence: sourceEvidenceSchema,
});
export const qualitySnapshotSchema = z.object({
  version: z.literal(1),
  resources: z.array(qualityResourceSchema).max(10000),
  relations: z.array(qualityRelationSchema).max(20000),
  environment: z.array(environmentReferenceSchema).max(10000),
  tests: z.array(qualityTestSchema).max(10000),
  testLinks: z.array(testSymbolLinkSchema).max(30000),
  coverage: z.array(qualityCoverageSchema).max(10000),
  dependencies: z.array(qualityDependencySchema).max(20000),
  findings: z.array(qualityFindingSchema).max(20000),
  scanners: z.array(scannerStatusSchema).max(3),
  diagnostics: z.array(qualityDiagnosticSchema).max(10000),
});
export const qualitySummarySchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  status: z.enum(["queued", "running", "completed", "failed"]),
  hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  findingCount: z.number().int().nonnegative(),
  failureCode: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export const findingReviewSchema = z.object({
  snapshotId: z.uuid(),
  findingId: id,
  state: findingStateSchema,
  severity: findingSeveritySchema.nullable(),
  reason: findingReasonSchema,
  revision: z.number().int().nonnegative(),
  actorId: z.string(),
  updatedAt: z.iso.datetime(),
});
export type QualitySnapshot = z.infer<typeof qualitySnapshotSchema>;
export type QualityFinding = z.infer<typeof qualityFindingSchema>;
export type QualityDependency = z.infer<typeof qualityDependencySchema>;
export type QualityTest = z.infer<typeof qualityTestSchema>;
export type ScannerStatus = z.infer<typeof scannerStatusSchema>;
