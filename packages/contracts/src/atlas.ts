import { z } from "zod";
import { resolutionSchema, sourceEvidenceSchema } from "./evidence.js";

export const atlasLayerSchema = z.enum([
  "services",
  "features",
  "sequences",
  "files",
  "functions",
]);
export type AtlasLayer = z.infer<typeof atlasLayerSchema>;

export const atlasJobListSchema = z.object({
  jobs: z.array(
    z.object({
      id: z.uuid(),
      repositoryId: z.uuid(),
      repositoryName: z.string(),
      commitSha: z.string(),
      ref: z.string(),
      status: z.enum(["queued", "running", "completed", "failed", "cancelled"]),
      stage: z.string(),
    }),
  ),
});

const node = z.object({
  id: z.string(),
  title: z.string(),
  group: z.string(),
  kind: z.string(),
  path: z.string().optional(),
  evidence: sourceEvidenceSchema.optional(),
});

const edge = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string(),
  status: resolutionSchema,
  evidence: sourceEvidenceSchema.optional(),
});

const layer = z.object({
  nodes: z.array(node),
  edges: z.array(edge),
  truncated: z.boolean(),
});

export const architectureAtlasSchema = z.object({
  jobId: z.uuid(),
  repositoryName: z.string(),
  commitSha: z.string(),
  layers: z.record(atlasLayerSchema, layer),
  health: z.object({
    files: z.number().int().nonnegative(),
    symbols: z.number().int().nonnegative(),
    diagnostics: z.number().int().nonnegative(),
    cycles: z.number().int().nonnegative(),
    unresolved: z.number().int().nonnegative(),
  }),
  tour: z.array(
    z.object({
      nodeId: z.string(),
      incomingImports: z.number().int().nonnegative(),
    }),
  ),
  executionReady: z.boolean(),
});

export type ArchitectureAtlas = z.infer<typeof architectureAtlasSchema>;
export type AtlasGraph = z.infer<typeof layer>;
export type AtlasNode = z.infer<typeof node>;
export type AtlasEdge = z.infer<typeof edge>;

export const architectureRulesSchema = z.strictObject({
  rules: z
    .array(
      z.strictObject({
        name: z.string().trim().min(1).max(100),
        kind: z.enum(["imports", "calls"]),
        from: z.string().trim().min(1).max(200),
        to: z.string().trim().min(1).max(200),
      }),
    )
    .max(50),
});
