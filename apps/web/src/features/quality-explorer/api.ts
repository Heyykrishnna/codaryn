import { z } from "zod";
import {
  qualitySummarySchema,
  qualityResourceSchema,
  qualityRelationSchema,
  qualityTestSchema,
  testSymbolLinkSchema,
  qualityCoverageSchema,
  qualityDependencySchema,
  environmentReferenceSchema,
  qualityFindingSchema,
  findingReviewSchema,
  findingStateSchema,
  findingSeveritySchema,
  scannerStatusSchema,
  qualityDiagnosticSchema,
} from "@codaryn/contracts";
export { jobsSchema } from "@/src/features/execution-explorer/api";
export { useArtifactResource } from "@/src/lib/artifact-resource";
export function qualityUrl(
  action: string,
  workspaceId: string,
  input: Record<string, string | number>,
) {
  return `/api/v1/quality/${action}?${new URLSearchParams({ workspaceId, ...Object.fromEntries(Object.entries(input).map(([k, v]) => [k, String(v)])) })}`;
}
export const summariesSchema = z.object({
  snapshots: z.array(qualitySummarySchema),
  page: z.number(),
  pageSize: z.number(),
});
export const overviewSchema = z.object({
  snapshot: qualitySummarySchema,
  resources: z.number(),
  tests: z.number(),
  dependencies: z.number(),
  findings: z.number(),
  groups: z.record(z.string(), z.number()),
  scanners: z.array(scannerStatusSchema),
  diagnostics: z.array(qualityDiagnosticSchema),
  diagnosticCount: z.number(),
  canReview: z.boolean(),
  externalScansAvailable: z.boolean(),
});
const pagination = {
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
};
export const inventorySchema = z.object({
  ...pagination,
  items: z.array(
    z.discriminatedUnion("view", [
      qualityResourceSchema.extend({ view: z.literal("resource") }),
      qualityTestSchema.extend({ view: z.literal("test") }),
      qualityCoverageSchema.extend({ view: z.literal("coverage") }),
      qualityDependencySchema.extend({ view: z.literal("dependency") }),
      environmentReferenceSchema.extend({ view: z.literal("environment") }),
    ]),
  ),
});
export const resourceSchema = z.object({
  resource: qualityResourceSchema,
  relations: z.array(qualityRelationSchema),
  resources: z.array(qualityResourceSchema),
});
export const testSchema = z.object({
  test: qualityTestSchema,
  links: z.array(testSymbolLinkSchema),
});
export const reviewedFindingSchema = qualityFindingSchema.extend({
  state: findingStateSchema,
  effectiveSeverity: findingSeveritySchema,
  review: findingReviewSchema.nullable(),
});
export const findingsSchema = z.object({
  ...pagination,
  items: z.array(reviewedFindingSchema),
});
export const findingSchema = z.object({
  finding: reviewedFindingSchema,
  dependency: qualityDependencySchema.nullable(),
  canReview: z.boolean(),
});
export const auditSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      findingId: z.string(),
      actorId: z.string(),
      before: findingReviewSchema.nullable(),
      after: findingReviewSchema,
      createdAt: z.iso.datetime(),
    }),
  ),
  page: z.number(),
  pageSize: z.number(),
});
export type Overview = z.infer<typeof overviewSchema>;
