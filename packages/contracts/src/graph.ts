import { z } from "zod";
import { sourceEvidenceSchema, resolutionSchema } from "./evidence.js";

export const dependencyNodeKindSchema = z.enum([
  "file",
  "symbol",
  "module",
  "external",
]);

export type DependencyNodeKind = z.infer<typeof dependencyNodeKindSchema>;

export const dependencyEdgeKindSchema = z.enum([
  "imports",
  "exports",
  "re_exports",
  "calls",
  "instantiates",
  "extends",
  "implements",
  "references",
]);

export type DependencyEdgeKind = z.infer<typeof dependencyEdgeKindSchema>;

export const resolutionStatusSchema = z.enum([
  "resolved",
  "unresolved",
  "ambiguous",
  "external",
]);

export type ResolutionStatus = z.infer<typeof resolutionStatusSchema>;

export const resolvedSymbolReferenceSchema = z.object({
  id: z.string().min(1),
  sourceFile: z.string().min(1),
  sourceSymbolName: z.string().min(1),
  localAlias: z.string().optional(),
  moduleSpecifier: z.string().min(1),
  targetFile: z.string().nullable(),
  targetSymbolId: z.string().nullable(),
  status: resolutionStatusSchema,
  evidence: sourceEvidenceSchema,
});

export type ResolvedSymbolReference = z.infer<
  typeof resolvedSymbolReferenceSchema
>;

export const dependencyNodeSchema = z.object({
  id: z.string().min(1),
  jobId: z.uuid(),
  kind: dependencyNodeKindSchema,
  path: z.string().min(1),
  name: z.string().min(1),
  language: z.string().optional(),
  linesOfCode: z.number().int().nonnegative().optional(),
});

export type DependencyNode = z.infer<typeof dependencyNodeSchema>;

export const dependencyEdgeSchema = z
  .object({
    id: z.string().min(1),
    jobId: z.uuid(),
    sourceId: z.string().min(1),
    targetId: z.string().min(1),
    kind: dependencyEdgeKindSchema,
    resolution: resolutionSchema,
    evidence: z.array(sourceEvidenceSchema),
    weight: z.number().int().positive().default(1),
  })
  .refine(
    (edge) =>
      !["DIRECT", "RESOLVED"].includes(edge.resolution) ||
      edge.evidence.length > 0,
    { message: "Confirmed relationships require source evidence" },
  );

export type DependencyEdge = z.infer<typeof dependencyEdgeSchema>;

export const dependencyCycleSchema = z.object({
  id: z.string().min(1),
  jobId: z.uuid(),
  length: z.number().int().positive(),
  nodeIds: z.array(z.string().min(1)),
  path: z.array(z.string().min(1)),
});

export type DependencyCycle = z.infer<typeof dependencyCycleSchema>;

export const moduleCouplingMetricSchema = z.object({
  jobId: z.uuid(),
  path: z.string().min(1),
  afferentCoupling: z.number().int().nonnegative(),
  efferentCoupling: z.number().int().nonnegative(),
  instability: z.number().min(0).max(1),
  depth: z.number().int().nonnegative(),
});

export type ModuleCouplingMetric = z.infer<typeof moduleCouplingMetricSchema>;

export const graphSnapshotResponseSchema = z.object({
  jobId: z.uuid(),
  nodes: z.array(dependencyNodeSchema),
  edges: z.array(dependencyEdgeSchema),
  cycles: z.array(dependencyCycleSchema),
  metrics: z.array(moduleCouplingMetricSchema),
  totalNodes: z.number().int().nonnegative(),
  totalEdges: z.number().int().nonnegative(),
  totalCycles: z.number().int().nonnegative(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  hasMore: z.boolean().optional(),
  truncated: z.boolean().optional(),
});

export type GraphSnapshotResponse = z.infer<typeof graphSnapshotResponseSchema>;

export const graphNeighborhoodQuerySchema = z.object({
  nodeId: z.string().min(1),
  depth: z.number().int().min(1).max(5).default(1),
  direction: z.enum(["incoming", "outgoing", "both"]).default("both"),
});

export type GraphNeighborhoodQuery = z.infer<
  typeof graphNeighborhoodQuerySchema
>;

export const graphPaginationQuerySchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(500).default(50),
  search: z.string().optional(),
  kind: dependencyNodeKindSchema.optional(),
  resolution: resolutionSchema.optional(),
});

export type GraphPaginationQuery = z.infer<typeof graphPaginationQuerySchema>;

export const unresolvedReferencesResponseSchema = z.object({
  jobId: z.uuid(),
  references: z.array(resolvedSymbolReferenceSchema),
  totalCount: z.number().int().nonnegative(),
});

export type UnresolvedReferencesResponse = z.infer<
  typeof unresolvedReferencesResponseSchema
>;
