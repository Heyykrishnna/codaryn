import { z } from "zod";
import { sourceEvidenceSchema } from "./evidence.js";
const id = z.string().min(1).max(1024);
export const executionFunctionSchema = z.object({
  id,
  name: z.string().min(1),
  kind: z.enum(["function", "method", "constructor", "callback", "module"]),
  parameters: z.array(z.string()),
  async: z.boolean(),
  evidence: sourceEvidenceSchema,
});
export const executionCallSchema = z
  .object({
    id,
    sourceId: id,
    targetId: id.nullable(),
    expression: z.string(),
    kind: z.enum(["call", "construct", "callback"]),
    resolution: z.enum(["RESOLVED", "UNRESOLVED"]),
    reason: z.string(),
    evidence: sourceEvidenceSchema,
  })
  .refine(
    (value) => (value.targetId !== null) === (value.resolution === "RESOLVED"),
    { message: "Call resolution requires a target" },
  );
export const executionControlNodeSchema = z.object({
  id,
  functionId: id,
  kind: z.enum([
    "entry",
    "exit",
    "statement",
    "decision",
    "loop",
    "return",
    "throw",
    "break",
    "continue",
    "unsupported",
  ]),
  label: z.string(),
  evidence: sourceEvidenceSchema,
});
export const executionControlEdgeSchema = z.object({
  id,
  functionId: id,
  sourceId: id,
  targetId: id,
  label: z.string(),
});
export const executionValueSchema = z.object({
  id,
  functionId: id,
  name: z.string(),
  kind: z.enum(["parameter", "definition", "assignment", "read", "return"]),
  evidence: sourceEvidenceSchema,
});
export const executionFlowSchema = z.object({
  id,
  functionId: id,
  sourceId: id,
  targetId: id,
  kind: z.enum(["may-reach", "expression", "return"]),
});
export const executionEntrySchema = z.object({
  id,
  functionId: id,
  kind: z.enum(["export", "next-route", "http-handler", "nest-handler"]),
  label: z.string(),
  evidence: sourceEvidenceSchema,
});
export const executionDiagnosticSchema = z.object({
  code: z.string(),
  message: z.string(),
  evidence: sourceEvidenceSchema,
});
export const executionSnapshotSchema = z.object({
  version: z.literal(1),
  semantics: z.literal("potential-static"),
  functions: z.array(executionFunctionSchema).max(10000),
  calls: z.array(executionCallSchema).max(50000),
  controlNodes: z.array(executionControlNodeSchema).max(50000),
  controlEdges: z.array(executionControlEdgeSchema).max(100000),
  values: z.array(executionValueSchema).max(50000),
  flows: z.array(executionFlowSchema).max(100000),
  entries: z.array(executionEntrySchema).max(10000),
  diagnostics: z.array(executionDiagnosticSchema).max(10000),
});
export type ExecutionSnapshot = z.infer<typeof executionSnapshotSchema>;
export type ExecutionFunction = z.infer<typeof executionFunctionSchema>;
export type ExecutionCall = z.infer<typeof executionCallSchema>;
export type ExecutionControlNode = z.infer<typeof executionControlNodeSchema>;
export type ExecutionValue = z.infer<typeof executionValueSchema>;
export const executionSnapshotSummarySchema = z.object({
  id: z.uuid(),
  jobId: z.uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  status: z.enum(["queued", "running", "completed", "failed"]),
  hash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable(),
  functionCount: z.number().int().nonnegative(),
  failureCode: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export const executionPathSchema = z.object({
  paths: z.array(z.array(id)),
  truncated: z.boolean(),
  visited: z.number(),
  semantics: z.literal("potential-static"),
});

export type ExecutionSnapshotSummary = z.infer<
  typeof executionSnapshotSummarySchema
>;
