import { z } from "zod";
import { sourceEvidenceSchema, resolutionSchema } from "./evidence.js";
const label = z.string().min(1).max(512);
export const schemaAdapterSchema = z.enum(["sql", "prisma", "drizzle"]);
export const schemaColumnSchema = z.object({
  id: label,
  name: label,
  type: label,
  nullable: z.boolean(),
  defaultValue: z.string().max(4096).nullable(),
  primaryKey: z.boolean(),
  unique: z.boolean(),
  evidence: sourceEvidenceSchema,
});
export const schemaConstraintSchema = z.object({
  id: label,
  name: label,
  kind: z.enum(["primary-key", "foreign-key", "unique", "index", "check"]),
  columns: z.array(label).max(100),
  expression: z.string().max(4096).nullable(),
  evidence: sourceEvidenceSchema,
});
export const schemaTableSchema = z.object({
  id: label,
  name: label,
  namespace: label,
  adapter: schemaAdapterSchema,
  modelName: label,
  domain: label,
  joinTable: z.boolean(),
  columns: z.array(schemaColumnSchema).max(500),
  constraints: z.array(schemaConstraintSchema).max(500),
  evidence: sourceEvidenceSchema,
  source: z.string().max(16000),
});
export const schemaRelationSchema = z.object({
  id: label,
  name: label,
  sourceTableId: label,
  targetTableId: label.nullable(),
  targetName: label,
  columns: z.array(label).max(100),
  targetColumns: z.array(label).max(100),
  cardinality: z.enum(["one-to-one", "one-to-many", "many-to-many"]),
  resolution: resolutionSchema,
  onDelete: z.string().max(100).nullable(),
  evidence: sourceEvidenceSchema,
});
export const schemaEnumSchema = z.object({
  id: label,
  name: label,
  adapter: schemaAdapterSchema,
  values: z.array(label).max(500),
  evidence: sourceEvidenceSchema,
});
export const schemaLineageSchema = z.object({
  id: label,
  kind: z.enum([
    "orm-model",
    "repository",
    "dto-field",
    "api-property",
    "frontend-field",
    "controller",
    "service",
  ]),
  name: label,
  tableId: label,
  columnId: label.nullable(),
  resolution: resolutionSchema,
  evidence: sourceEvidenceSchema,
});
export const schemaSnapshotSchema = z.object({
  version: z.literal(1),
  tables: z.array(schemaTableSchema).max(1000),
  relations: z.array(schemaRelationSchema).max(5000),
  enums: z.array(schemaEnumSchema).max(1000),
  lineage: z.array(schemaLineageSchema).max(10000),
  diagnostics: z
    .array(
      z.object({
        code: label,
        message: z.string().max(1000),
        evidence: sourceEvidenceSchema,
      }),
    )
    .max(5000),
});
export const schemaSnapshotSummarySchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  status: z.enum(["queued", "running", "completed", "failed"]),
  hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  tableCount: z.number().int().nonnegative(),
  failureCode: z.string().nullable(),
  createdAt: z.string(),
});
export const schemaSnapshotDetailSchema = schemaSnapshotSummarySchema.extend({
  snapshot: schemaSnapshotSchema.nullable(),
});
export const schemaComparisonSchema = z.object({
  from: label,
  to: label,
  changes: z
    .array(
      z.object({
        kind: z.enum(["added", "removed", "changed"]),
        object: z.enum(["table", "column", "constraint", "relation", "enum"]),
        name: label,
        before: z.string().nullable(),
        after: z.string().nullable(),
      }),
    )
    .max(20000),
});
export type SchemaAdapter = z.infer<typeof schemaAdapterSchema>;
export type SchemaColumn = z.infer<typeof schemaColumnSchema>;
export type SchemaTable = z.infer<typeof schemaTableSchema>;
export type SchemaConstraint = z.infer<typeof schemaConstraintSchema>;
export type SchemaRelation = z.infer<typeof schemaRelationSchema>;
export type SchemaSnapshot = z.infer<typeof schemaSnapshotSchema>;
export type SchemaLineage = z.infer<typeof schemaLineageSchema>;
export type SchemaSnapshotSummary = z.infer<typeof schemaSnapshotSummarySchema>;
export type SchemaComparison = z.infer<typeof schemaComparisonSchema>;
