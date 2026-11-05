import { z } from "zod";
import { sourceEvidenceSchema } from "./evidence.js";
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const path = z.string().min(1).max(1024);
export const versionSymbolSchema = z.object({
  id: hash,
  name: z.string().max(256),
  kind: z.string().max(50),
  hash,
  evidence: sourceEvidenceSchema,
});
export const versionFileSchema = z.object({
  path,
  hash,
  artifactHash: hash,
  symbols: z.array(versionSymbolSchema).max(10000),
  imports: z
    .array(
      z.object({
        specifier: z.string().max(512),
        evidence: sourceEvidenceSchema,
      }),
    )
    .max(10000),
  diagnostics: z.array(z.string().max(100)).max(1000),
});
export const versionEdgeSchema = z.object({
  id: hash,
  source: path,
  target: path.nullable(),
  specifier: z.string().max(512),
  resolution: z.enum(["resolved", "external", "unresolved"]),
  evidence: sourceEvidenceSchema,
});
export const versionSchemaObjectSchema = z.object({
  id: hash,
  name: z.string().max(512),
  kind: z.enum(["table", "column", "constraint", "relation", "enum"]),
  hash,
  evidence: sourceEvidenceSchema,
});
export const versionSnapshotSchema = z.object({
  version: z.literal(1),
  analyzer: z.string().max(100),
  compatibility: hash,
  files: z.array(versionFileSchema).max(10000),
  edges: z.array(versionEdgeSchema).max(30000),
  schema: z.array(versionSchemaObjectSchema).max(30000),
  schemaDiagnostics: z.number().int().nonnegative(),
  contentHash: hash,
  reuse: z.object({
    reused: z.number().int().nonnegative(),
    processed: z.number().int().nonnegative(),
    invalidated: z.boolean(),
    verification: z.enum(["not-requested", "matched", "fallback-full"]),
  }),
});
export const versionSummarySchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  repositoryId: z.uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  status: z.enum(["queued", "running", "completed", "failed"]),
  hash: hash.nullable(),
  fileCount: z.number().int().nonnegative(),
  failureCode: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export const architectureChangeSchema = z.object({
  id: hash,
  kind: z.enum(["added", "removed", "changed"]),
  object: z.enum([
    "file",
    "symbol",
    "relationship",
    "table",
    "column",
    "constraint",
    "relation",
    "enum",
  ]),
  name: z.string().max(1024),
  before: hash.nullable(),
  after: hash.nullable(),
  evidence: sourceEvidenceSchema,
});
export const impactSchema = z.object({
  path,
  depth: z.number().int().nonnegative(),
  reason: z.enum(["changed", "dependent"]),
  via: path.nullable(),
});
export const comparisonResultSchema = z.object({
  version: z.literal(1),
  changes: z.array(architectureChangeSchema).max(50000),
  impact: z.array(impactSchema).max(10000),
  truncated: z.boolean(),
  drift: z.array(
    z.enum([
      "removed-symbols",
      "removed-schema-objects",
      "new-unresolved-imports",
      "configuration-changed",
    ]),
  ),
  semantics: z.literal("potential-static"),
});
export type VersionSnapshot = z.infer<typeof versionSnapshotSchema>;
export type VersionFile = z.infer<typeof versionFileSchema>;
export type ComparisonResult = z.infer<typeof comparisonResultSchema>;

export const branchRefSchema = z
  .string()
  .max(200)
  .regex(/^refs\/heads\/[A-Za-z0-9][A-Za-z0-9._/-]*$/)
  .refine(
    (ref) =>
      !ref.includes("..") &&
      !ref.includes("//") &&
      !ref.endsWith("/") &&
      !ref.endsWith(".lock"),
  );
