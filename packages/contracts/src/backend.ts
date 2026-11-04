import { z } from "zod";
import { sourceEvidenceSchema } from "./evidence.js";

export const backendFrameworkSchema = z.enum([
  "express",
  "nestjs",
  "fastify",
  "custom",
]);
export type BackendFramework = z.infer<typeof backendFrameworkSchema>;

export const backendHttpMethodSchema = z.enum([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "ALL",
]);
export type BackendHttpMethod = z.infer<typeof backendHttpMethodSchema>;

export const middlewareKindSchema = z.enum([
  "auth",
  "validation",
  "logging",
  "cors",
  "rate_limit",
  "custom",
]);
export type MiddlewareKind = z.infer<typeof middlewareKindSchema>;

export const backendRouteSchema = z.object({
  id: z.string().min(1),
  framework: backendFrameworkSchema,
  method: backendHttpMethodSchema,
  path: z.string().min(1),
  filePath: z.string().min(1),
  handlerName: z.string().min(1),
  handlerSymbolId: z.string().nullable().default(null),
  controllerName: z.string().nullable().default(null),
  middleware: z.array(z.string()).default([]),
  isDynamic: z.boolean().default(false),
  sourceEvidence: sourceEvidenceSchema,
});
export type BackendRoute = z.infer<typeof backendRouteSchema>;

export const backendControllerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  framework: backendFrameworkSchema,
  routesCount: z.number().int().nonnegative().default(0),
  basePath: z.string().nullable().default(null),
  sourceEvidence: sourceEvidenceSchema,
});
export type BackendController = z.infer<typeof backendControllerSchema>;

export const backendServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  methods: z.array(z.string()).default([]),
  injectedDependencies: z.array(z.string()).default([]),
  sourceEvidence: sourceEvidenceSchema,
});
export type BackendService = z.infer<typeof backendServiceSchema>;

export const repositoryOrmKindSchema = z.enum([
  "prisma",
  "drizzle",
  "typeorm",
  "kysely",
  "sql",
  "custom",
]);
export type RepositoryOrmKind = z.infer<typeof repositoryOrmKindSchema>;

export const backendRepositorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  ormType: repositoryOrmKindSchema,
  methods: z.array(z.string()).default([]),
  sourceEvidence: sourceEvidenceSchema,
});
export type BackendRepository = z.infer<typeof backendRepositorySchema>;

export const backendMiddlewareSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  filePath: z.string().min(1),
  kind: middlewareKindSchema,
  scope: z.enum(["route", "router", "global"]),
  sourceEvidence: sourceEvidenceSchema,
});
export type BackendMiddleware = z.infer<typeof backendMiddlewareSchema>;

export const requestFlowSchema = z.object({
  id: z.string().min(1),
  routeId: z.string().min(1),
  routePath: z.string().min(1),
  httpMethod: backendHttpMethodSchema,
  controllerName: z.string().nullable().default(null),
  serviceNames: z.array(z.string()).default([]),
  repositoryNames: z.array(z.string()).default([]),
  middlewareChain: z.array(z.string()).default([]),
  sourceEvidence: sourceEvidenceSchema,
});
export type RequestFlow = z.infer<typeof requestFlowSchema>;

export const backendOverviewResponseSchema = z.object({
  jobId: z.string().min(1),
  detectedFrameworks: z.array(z.string()),
  totalRoutes: z.number().int().nonnegative(),
  totalControllers: z.number().int().nonnegative(),
  totalServices: z.number().int().nonnegative(),
  totalRepositories: z.number().int().nonnegative(),
  totalMiddleware: z.number().int().nonnegative(),
  totalRequestFlows: z.number().int().nonnegative(),
  authenticationPatterns: z.array(z.string()),
  validationPatterns: z.array(z.string()),
});
export type BackendOverviewResponse = z.infer<
  typeof backendOverviewResponseSchema
>;

export const backendRoutesResponseSchema = z.object({
  jobId: z.string().min(1),
  routes: z.array(backendRouteSchema),
  totalCount: z.number().int().nonnegative(),
});
export type BackendRoutesResponse = z.infer<typeof backendRoutesResponseSchema>;

export const backendControllersResponseSchema = z.object({
  jobId: z.string().min(1),
  controllers: z.array(backendControllerSchema),
  totalCount: z.number().int().nonnegative(),
});
export type BackendControllersResponse = z.infer<
  typeof backendControllersResponseSchema
>;

export const backendServicesResponseSchema = z.object({
  jobId: z.string().min(1),
  services: z.array(backendServiceSchema),
  totalCount: z.number().int().nonnegative(),
});
export type BackendServicesResponse = z.infer<
  typeof backendServicesResponseSchema
>;

export const backendRepositoriesResponseSchema = z.object({
  jobId: z.string().min(1),
  repositories: z.array(backendRepositorySchema),
  totalCount: z.number().int().nonnegative(),
});
export type BackendRepositoriesResponse = z.infer<
  typeof backendRepositoriesResponseSchema
>;

export const backendMiddlewareResponseSchema = z.object({
  jobId: z.string().min(1),
  middleware: z.array(backendMiddlewareSchema),
  totalCount: z.number().int().nonnegative(),
});
export type BackendMiddlewareResponse = z.infer<
  typeof backendMiddlewareResponseSchema
>;

export const requestFlowsResponseSchema = z.object({
  jobId: z.string().min(1),
  flows: z.array(requestFlowSchema),
  totalCount: z.number().int().nonnegative(),
});
export type RequestFlowsResponse = z.infer<typeof requestFlowsResponseSchema>;

export const backendRouteDetailResponseSchema = z.object({
  route: backendRouteSchema,
  controller: backendControllerSchema.nullable().default(null),
  services: z.array(backendServiceSchema),
  repositories: z.array(backendRepositorySchema),
  middlewareChain: z.array(backendMiddlewareSchema),
  requestFlow: requestFlowSchema.nullable().default(null),
});
export type BackendRouteDetailResponse = z.infer<
  typeof backendRouteDetailResponseSchema
>;
