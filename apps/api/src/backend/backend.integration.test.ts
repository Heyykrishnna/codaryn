import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Pool } from "pg";
import { BackendService } from "./service.js";

function createMockPool(workspaceId: string, jobId: string): Pool {
  const routes = [
    {
      id: "route:express:src/routes.ts:GET:/api/v1/orders",
      framework: "express",
      method: "GET",
      path: "/api/v1/orders",
      file_path: "src/routes.ts",
      handler_name: "listOrders",
      handler_symbol_id: null,
      controller_name: "OrderController",
      middleware: ["authMiddleware"],
      is_dynamic: false,
      source_evidence: {
        filePath: "src/routes.ts",
        startLine: 10,
        endLine: 15,
      },
    },
    {
      id: "route:nestjs:src/user.controller.ts:GET:/api/v1/users/:id",
      framework: "nestjs",
      method: "GET",
      path: "/api/v1/users/:id",
      file_path: "src/user.controller.ts",
      handler_name: "getUserById",
      handler_symbol_id: null,
      controller_name: "UserController",
      middleware: ["AuthGuard"],
      is_dynamic: true,
      source_evidence: {
        filePath: "src/user.controller.ts",
        startLine: 12,
        endLine: 18,
      },
    },
  ];

  const controllers = [
    {
      id: "ctrl:nestjs:src/user.controller.ts:UserController",
      name: "UserController",
      path: "src/user.controller.ts",
      framework: "nestjs",
      routes_count: 1,
      base_path: "/api/v1/users",
      source_evidence: {
        filePath: "src/user.controller.ts",
        startLine: 5,
        endLine: 25,
      },
    },
  ];

  const services = [
    {
      id: "svc:src/user.service.ts:UserService",
      name: "UserService",
      path: "src/user.service.ts",
      methods: ["getUser", "listUsers"],
      injected_dependencies: ["UserRepository"],
      source_evidence: {
        filePath: "src/user.service.ts",
        startLine: 4,
        endLine: 20,
      },
    },
  ];

  const repositories = [
    {
      id: "repo:src/user.repository.ts:UserRepository",
      name: "UserRepository",
      path: "src/user.repository.ts",
      orm_type: "drizzle",
      methods: ["findById", "findAll"],
      source_evidence: {
        filePath: "src/user.repository.ts",
        startLine: 3,
        endLine: 15,
      },
    },
  ];

  const middleware = [
    {
      id: "mw:src/auth.ts:authMiddleware",
      name: "authMiddleware",
      path: "src/auth.ts",
      kind: "auth",
      scope: "route",
      source_evidence: {
        filePath: "src/auth.ts",
        startLine: 1,
        endLine: 10,
      },
    },
    {
      id: "mw:src/auth.ts:AuthGuard",
      name: "AuthGuard",
      path: "src/auth.ts",
      kind: "auth",
      scope: "route",
      source_evidence: {
        filePath: "src/auth.ts",
        startLine: 12,
        endLine: 22,
      },
    },
  ];

  const requestFlows = [
    {
      id: "flow:route:nestjs:src/user.controller.ts:GET:/api/v1/users/:id",
      route_id: "route:nestjs:src/user.controller.ts:GET:/api/v1/users/:id",
      route_path: "/api/v1/users/:id",
      http_method: "GET",
      controller_name: "UserController",
      service_names: ["UserService"],
      repository_names: ["UserRepository"],
      middleware_chain: ["AuthGuard"],
      source_evidence: {
        filePath: "src/user.controller.ts",
        startLine: 12,
        endLine: 18,
      },
    },
  ];

  return {
    query: async (sql: string, values?: unknown[]) => {
      if (sql.includes("SELECT organization_id FROM analysis_jobs")) {
        const jId = values?.[0];
        if (jId === jobId) {
          return { rows: [{ organization_id: workspaceId }] };
        }
        return { rows: [] };
      }
      if (sql.includes("FROM analysis_backend_routes")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(routes.length) }] };
        }
        if (sql.includes("SELECT DISTINCT framework")) {
          return { rows: [{ framework: "express" }, { framework: "nestjs" }] };
        }
        if (sql.includes("AND id=$2")) {
          const rId = values?.[1];
          const found = routes.find((r) => r.id === rId);
          return { rows: found ? [found] : [] };
        }
        return { rows: routes };
      }
      if (sql.includes("FROM analysis_backend_controllers")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(controllers.length) }] };
        }
        if (sql.includes("AND name=$2")) {
          const cName = values?.[1];
          const found = controllers.find((c) => c.name === cName);
          return { rows: found ? [found] : [] };
        }
        return { rows: controllers };
      }
      if (sql.includes("FROM analysis_backend_services")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(services.length) }] };
        }
        if (sql.includes("AND name=ANY($2)")) {
          return { rows: services };
        }
        return { rows: services };
      }
      if (sql.includes("FROM analysis_backend_repositories")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(repositories.length) }] };
        }
        if (sql.includes("AND name=ANY($2)")) {
          return { rows: repositories };
        }
        return { rows: repositories };
      }
      if (sql.includes("FROM analysis_backend_middleware")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(middleware.length) }] };
        }
        if (sql.includes("SELECT DISTINCT kind")) {
          return { rows: [{ kind: "auth" }] };
        }
        if (sql.includes("AND name=ANY($2)")) {
          return { rows: middleware };
        }
        return { rows: middleware };
      }
      if (sql.includes("FROM analysis_backend_request_flows")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(requestFlows.length) }] };
        }
        if (sql.includes("AND route_id=$2")) {
          const rId = values?.[1];
          const found = requestFlows.find((f) => f.route_id === rId);
          return { rows: found ? [found] : [] };
        }
        return { rows: requestFlows };
      }
      return { rows: [] };
    },
  } as unknown as Pool;
}

test("BackendService returns overview with route, controller, service, and repository counts", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new BackendService(pool);

  const overview = await service.getOverview(wsId, jId);
  assert.equal(overview.totalRoutes, 2);
  assert.equal(overview.totalControllers, 1);
  assert.equal(overview.totalServices, 1);
  assert.equal(overview.totalRepositories, 1);
  assert.equal(overview.totalMiddleware, 2);
  assert.equal(overview.totalRequestFlows, 1);
  assert.deepEqual(overview.detectedFrameworks, ["express", "nestjs"]);
  assert.deepEqual(overview.authenticationPatterns, ["auth"]);
});

test("BackendService returns routes and detailed request flow trace", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new BackendService(pool);

  const routes = await service.getRoutes(wsId, jId);
  assert.equal(routes.totalCount, 2);
  assert.equal(routes.routes[0]?.path, "/api/v1/orders");

  const detail = await service.getRouteDetail(
    wsId,
    jId,
    "route:nestjs:src/user.controller.ts:GET:/api/v1/users/:id",
  );
  assert.equal(detail.route.handlerName, "getUserById");
  assert.equal(detail.controller?.name, "UserController");
  assert.equal(detail.services.length, 1);
  assert.equal(detail.services[0]?.name, "UserService");
  assert.equal(detail.repositories.length, 1);
  assert.equal(detail.repositories[0]?.name, "UserRepository");
  assert.equal(detail.middlewareChain.length, 2);
  assert.ok(detail.requestFlow);
  assert.equal(detail.requestFlow?.routePath, "/api/v1/users/:id");
});

test("BackendService returns controllers, services, repositories, and middleware", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new BackendService(pool);

  const controllers = await service.getControllers(wsId, jId);
  assert.equal(controllers.totalCount, 1);
  assert.equal(controllers.controllers[0]?.name, "UserController");

  const services = await service.getServices(wsId, jId);
  assert.equal(services.totalCount, 1);
  assert.equal(services.services[0]?.name, "UserService");

  const repositories = await service.getRepositories(wsId, jId);
  assert.equal(repositories.totalCount, 1);
  assert.equal(repositories.repositories[0]?.name, "UserRepository");

  const middleware = await service.getMiddleware(wsId, jId);
  assert.equal(middleware.totalCount, 2);
  assert.equal(middleware.middleware[0]?.name, "authMiddleware");

  const flows = await service.getRequestFlows(wsId, jId);
  assert.equal(flows.totalCount, 1);
  assert.equal(flows.flows[0]?.routePath, "/api/v1/users/:id");
});

test("BackendService enforces tenant workspace isolation", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new BackendService(pool);

  await assert.rejects(
    async () => service.getOverview("wrong-workspace", jId),
    /Analysis job not found in workspace/,
  );
});
