import { z } from "zod";
import { resolutionSchema, sourceEvidenceSchema } from "./evidence.js";

export const diagramTypeSchema = z.enum([
  "system",
  "frontend",
  "backend",
  "api",
  "erd",
  "dependencies",
  "execution",
  "infrastructure",
]);

export type DiagramType = z.infer<typeof diagramTypeSchema>;

export const diagramNodeSchema = z.strictObject({
  id: z.string().min(1).max(256),
  label: z.string().min(1).max(256),
  kind: z.string().min(1).max(64),
  group: z.string().min(1).max(128).optional(),
  status: resolutionSchema,
  evidence: sourceEvidenceSchema.optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
});

export type DiagramNode = z.infer<typeof diagramNodeSchema>;

export const diagramEdgeSchema = z.strictObject({
  id: z.string().min(1).max(256),
  source: z.string().min(1).max(256),
  target: z.string().min(1).max(256),
  label: z.string().max(128).optional(),
  kind: z.string().min(1).max(64),
  status: resolutionSchema,
  evidence: sourceEvidenceSchema.optional(),
  weight: z.number().int().min(1).max(1000).default(1),
  bidirectional: z.boolean().default(false),
});

export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;

export const diagramLegendItemSchema = z.strictObject({
  category: z.enum(["node", "edge", "confidence"]),
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  description: z.string().min(1).max(512),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  shape: z
    .enum(["rectangle", "rounded", "circle", "diamond", "cylinder"])
    .optional(),
});

export type DiagramLegendItem = z.infer<typeof diagramLegendItemSchema>;

export const diagramLayoutPointSchema = z.strictObject({
  x: z.number().finite(),
  y: z.number().finite(),
});

export type DiagramLayoutPoint = z.infer<typeof diagramLayoutPointSchema>;

export const diagramLayoutConfigSchema = z.strictObject({
  zoom: z.number().min(0.05).max(10).default(1),
  pan: diagramLayoutPointSchema.default({ x: 0, y: 0 }),
  positions: z
    .record(z.string().min(1).max(256), diagramLayoutPointSchema)
    .default({}),
  collapsedGroups: z.array(z.string().min(1).max(128)).default([]),
  engine: z.enum(["dagre", "force", "manual", "grid"]).default("dagre"),
});

export type DiagramLayoutConfig = z.infer<typeof diagramLayoutConfigSchema>;

export const savedDiagramLayoutSchema = z.strictObject({
  id: z.string().uuid(),
  diagramType: diagramTypeSchema,
  name: z.string().trim().min(1).max(100),
  layoutConfig: diagramLayoutConfigSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  actorId: z.string().min(1),
});

export type SavedDiagramLayout = z.infer<typeof savedDiagramLayoutSchema>;

export const diagramMetadataSchema = z.strictObject({
  generatedAt: z.string().datetime(),
  nodeCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  analyzerVersion: z.string().min(1).max(32),
  uncertaintiesCount: z.number().int().nonnegative(),
});

export type DiagramMetadata = z.infer<typeof diagramMetadataSchema>;

export const diagramGraphSchema = z.strictObject({
  diagramType: diagramTypeSchema,
  jobId: z.string().uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  nodes: z.array(diagramNodeSchema),
  edges: z.array(diagramEdgeSchema),
  legend: z.array(diagramLegendItemSchema),
  metadata: diagramMetadataSchema,
});

export type DiagramGraph = z.infer<typeof diagramGraphSchema>;
