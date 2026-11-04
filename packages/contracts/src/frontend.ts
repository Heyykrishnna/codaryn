import { z } from "zod";
import { sourceEvidenceSchema } from "./evidence.js";

export const componentKindSchema = z.enum([
  "function",
  "arrow",
  "class",
  "lazy",
  "memo",
  "forward_ref",
]);
export type ComponentKind = z.infer<typeof componentKindSchema>;

export const componentExportTypeSchema = z.enum([
  "default",
  "named",
  "internal",
]);
export type ComponentExportType = z.infer<typeof componentExportTypeSchema>;

export const componentPropSchema = z.object({
  name: z.string().min(1),
  type: z.string().optional(),
  required: z.boolean().default(true),
});
export type ComponentProp = z.infer<typeof componentPropSchema>;

export const frontendComponentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  kind: componentKindSchema,
  exportType: componentExportTypeSchema,
  props: z.array(componentPropSchema).default([]),
  hooksCount: z.number().int().nonnegative().default(0),
  renderedComponentsCount: z.number().int().nonnegative().default(0),
  sourceEvidence: sourceEvidenceSchema,
});
export type FrontendComponent = z.infer<typeof frontendComponentSchema>;

export const frontendJsxElementSchema = z.object({
  id: z.string().min(1),
  sourceComponentId: z.string().min(1),
  targetComponentName: z.string().min(1),
  targetComponentId: z.string().nullable().default(null),
  props: z.array(z.string()).default([]),
  isConditional: z.boolean().default(false),
  sourceEvidence: sourceEvidenceSchema,
});
export type FrontendJsxElement = z.infer<typeof frontendJsxElementSchema>;

export const hookKindSchema = z.enum([
  "state",
  "effect",
  "context",
  "ref",
  "callback",
  "memo",
  "custom",
  "other",
]);
export type HookKind = z.infer<typeof hookKindSchema>;

export const frontendHookCallSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  name: z.string().min(1),
  kind: hookKindSchema,
  dependencies: z.array(z.string()).optional(),
  sourceEvidence: sourceEvidenceSchema,
});
export type FrontendHookCall = z.infer<typeof frontendHookCallSchema>;

export const frontendContextSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  defaultValue: z.string().optional(),
  providerComponentIds: z.array(z.string()).default([]),
  consumerComponentIds: z.array(z.string()).default([]),
  sourceEvidence: sourceEvidenceSchema,
});
export type FrontendContext = z.infer<typeof frontendContextSchema>;

export const routeFrameworkSchema = z.enum([
  "nextjs_app",
  "nextjs_pages",
  "react_router",
  "custom",
]);
export type RouteFramework = z.infer<typeof routeFrameworkSchema>;

export const frontendRouteSchema = z.object({
  id: z.string().min(1),
  framework: routeFrameworkSchema,
  routePath: z.string().min(1),
  filePath: z.string().min(1),
  componentName: z.string().optional(),
  componentId: z.string().nullable().default(null),
  dynamicParams: z.array(z.string()).default([]),
  isLayout: z.boolean().default(false),
  sourceEvidence: sourceEvidenceSchema,
});
export type FrontendRoute = z.infer<typeof frontendRouteSchema>;

export const stateKindSchema = z.enum([
  "local",
  "context",
  "zustand",
  "redux",
  "query",
  "other",
]);
export type StateKind = z.infer<typeof stateKindSchema>;

export const frontendStateSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  kind: stateKindSchema,
  identifier: z.string().min(1),
  initialValue: z.string().optional(),
  sourceEvidence: sourceEvidenceSchema,
});
export type FrontendState = z.infer<typeof frontendStateSchema>;

export const httpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "CUSTOM",
]);
export type HttpMethod = z.infer<typeof httpMethodSchema>;

export const apiClientKindSchema = z.enum(["fetch", "axios", "custom"]);
export type ApiClientKind = z.infer<typeof apiClientKindSchema>;

export const frontendApiClientCallSchema = z.object({
  id: z.string().min(1),
  componentId: z.string().min(1),
  filePath: z.string().min(1),
  method: httpMethodSchema,
  endpoint: z.string().min(1),
  isDynamic: z.boolean().default(false),
  clientType: apiClientKindSchema,
  sourceEvidence: sourceEvidenceSchema,
});
export type FrontendApiClientCall = z.infer<typeof frontendApiClientCallSchema>;

export const frontendOverviewResponseSchema = z.object({
  jobId: z.string().min(1),
  detectedFrameworks: z.array(z.string()),
  totalComponents: z.number().int().nonnegative(),
  totalRoutes: z.number().int().nonnegative(),
  totalHooks: z.number().int().nonnegative(),
  totalContexts: z.number().int().nonnegative(),
  totalApiClients: z.number().int().nonnegative(),
  stateManagementPatterns: z.array(z.string()),
});
export type FrontendOverviewResponse = z.infer<
  typeof frontendOverviewResponseSchema
>;

export const frontendComponentsResponseSchema = z.object({
  jobId: z.string().min(1),
  components: z.array(frontendComponentSchema),
  totalCount: z.number().int().nonnegative(),
});
export type FrontendComponentsResponse = z.infer<
  typeof frontendComponentsResponseSchema
>;

export const frontendComponentDetailResponseSchema = z.object({
  component: frontendComponentSchema,
  renderedComponents: z.array(frontendJsxElementSchema),
  hooks: z.array(frontendHookCallSchema),
  state: z.array(frontendStateSchema),
  contextsConsumed: z.array(frontendContextSchema),
  apiCalls: z.array(frontendApiClientCallSchema),
  incomingRenders: z.array(frontendJsxElementSchema),
});
export type FrontendComponentDetailResponse = z.infer<
  typeof frontendComponentDetailResponseSchema
>;

export const frontendRoutesResponseSchema = z.object({
  jobId: z.string().min(1),
  routes: z.array(frontendRouteSchema),
  totalCount: z.number().int().nonnegative(),
});
export type FrontendRoutesResponse = z.infer<
  typeof frontendRoutesResponseSchema
>;

export const frontendHooksResponseSchema = z.object({
  jobId: z.string().min(1),
  hooks: z.array(frontendHookCallSchema),
  totalCount: z.number().int().nonnegative(),
});
export type FrontendHooksResponse = z.infer<
  typeof frontendHooksResponseSchema
>;

export const frontendContextsResponseSchema = z.object({
  jobId: z.string().min(1),
  contexts: z.array(frontendContextSchema),
  totalCount: z.number().int().nonnegative(),
});
export type FrontendContextsResponse = z.infer<
  typeof frontendContextsResponseSchema
>;

export const frontendStateResponseSchema = z.object({
  jobId: z.string().min(1),
  state: z.array(frontendStateSchema),
  totalCount: z.number().int().nonnegative(),
});
export type FrontendStateResponse = z.infer<
  typeof frontendStateResponseSchema
>;

export const frontendApiClientsResponseSchema = z.object({
  jobId: z.string().min(1),
  apiCalls: z.array(frontendApiClientCallSchema),
  totalCount: z.number().int().nonnegative(),
});
export type FrontendApiClientsResponse = z.infer<
  typeof frontendApiClientsResponseSchema
>;
