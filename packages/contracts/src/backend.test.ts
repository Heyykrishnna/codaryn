import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  backendRouteSchema,
  backendControllerSchema,
  backendServiceSchema,
  backendRepositorySchema,
  backendMiddlewareSchema,
  requestFlowSchema,
  backendOverviewResponseSchema,
  backendRoutesResponseSchema,
  backendRouteDetailResponseSchema,
} from "./backend.js";

test("backendRouteSchema validates express and nestjs route definitions", () => {
  const expressRoute = {
    id: "route:express:src/routes/user.ts:GET:/api/v1/users",
    framework: "express",
    method: "GET",
    path: "/api/v1/users",
    filePath: "src/routes/user.ts",
    handlerName: "getUsers",
    handlerSymbolId: "sym:src/controllers/user.ts:function:getUsers:10:1",
    controllerName: "UserController",
    middleware: ["authMiddleware"],
    isDynamic: false,
    sourceEvidence: {
      path: "src/routes/user.ts",
      startLine: 12,
      endLine: 12,
    },
  };

  const parsed = backendRouteSchema.parse(expressRoute);
  assert.equal(parsed.method, "GET");
  assert.equal(parsed.framework, "express");
  assert.equal(parsed.middleware.length, 1);
});

test("backendControllerSchema and backendServiceSchema validate correctly", () => {
  const controller = {
    id: "ctrl:src/users/users.controller.ts:UsersController",
    name: "UsersController",
    filePath: "src/users/users.controller.ts",
    framework: "nestjs",
    routesCount: 4,
    basePath: "users",
    sourceEvidence: {
      path: "src/users/users.controller.ts",
      startLine: 5,
      endLine: 40,
    },
  };
  const parsedCtrl = backendControllerSchema.parse(controller);
  assert.equal(parsedCtrl.routesCount, 4);
  assert.equal(parsedCtrl.basePath, "users");

  const service = {
    id: "svc:src/users/users.service.ts:UsersService",
    name: "UsersService",
    filePath: "src/users/users.service.ts",
    methods: ["findAll", "findById", "create"],
    injectedDependencies: ["UserRepository"],
    sourceEvidence: {
      path: "src/users/users.service.ts",
      startLine: 6,
      endLine: 50,
    },
  };
  const parsedSvc = backendServiceSchema.parse(service);
  assert.equal(parsedSvc.methods.length, 3);
  assert.equal(parsedSvc.injectedDependencies[0], "UserRepository");
});

test("backendRepositorySchema and backendMiddlewareSchema validate correctly", () => {
  const repository = {
    id: "repo:src/users/user.repository.ts:UserRepository",
    name: "UserRepository",
    filePath: "src/users/user.repository.ts",
    ormType: "drizzle",
    methods: ["findMany", "insertOne"],
    sourceEvidence: {
      path: "src/users/user.repository.ts",
      startLine: 8,
      endLine: 35,
    },
  };
  const parsedRepo = backendRepositorySchema.parse(repository);
  assert.equal(parsedRepo.ormType, "drizzle");

  const middleware = {
    id: "mw:src/middleware/auth.ts:requireAuth",
    name: "requireAuth",
    filePath: "src/middleware/auth.ts",
    kind: "auth",
    scope: "route",
    sourceEvidence: {
      path: "src/middleware/auth.ts",
      startLine: 10,
      endLine: 25,
    },
  };
  const parsedMw = backendMiddlewareSchema.parse(middleware);
  assert.equal(parsedMw.kind, "auth");
  assert.equal(parsedMw.scope, "route");
});

test("requestFlowSchema and overview response schemas validate correctly", () => {
  const flow = {
    id: "flow:route:1",
    routeId: "route:1",
    routePath: "/users",
    httpMethod: "GET",
    controllerName: "UsersController",
    serviceNames: ["UsersService"],
    repositoryNames: ["UserRepository"],
    middlewareChain: ["authGuard", "rateLimiter"],
    sourceEvidence: {
      path: "src/users/users.controller.ts",
      startLine: 10,
      endLine: 15,
    },
  };
  const parsedFlow = requestFlowSchema.parse(flow);
  assert.equal(parsedFlow.middlewareChain.length, 2);
  assert.equal(parsedFlow.repositoryNames[0], "UserRepository");

  const overview = {
    jobId: "job-1",
    detectedFrameworks: ["express", "nestjs"],
    totalRoutes: 12,
    totalControllers: 3,
    totalServices: 3,
    totalRepositories: 2,
    totalMiddleware: 4,
    totalRequestFlows: 12,
    authenticationPatterns: ["passport", "guards"],
    validationPatterns: ["zod", "pipes"],
  };
  const parsedOverview = backendOverviewResponseSchema.parse(overview);
  assert.equal(parsedOverview.totalRoutes, 12);

  const routesResponse = {
    jobId: "job-1",
    routes: [],
    totalCount: 0,
  };
  assert.equal(backendRoutesResponseSchema.parse(routesResponse).totalCount, 0);

  const detailResponse = {
    route: {
      id: "r1",
      framework: "fastify",
      method: "POST",
      path: "/items",
      filePath: "src/routes.ts",
      handlerName: "createItem",
      handlerSymbolId: null,
      controllerName: null,
      middleware: [],
      isDynamic: false,
      sourceEvidence: { path: "src/routes.ts", startLine: 1, endLine: 5 },
    },
    controller: null,
    services: [],
    repositories: [],
    middlewareChain: [],
    requestFlow: null,
  };
  assert.equal(
    backendRouteDetailResponseSchema.parse(detailResponse).route.framework,
    "fastify",
  );
});
