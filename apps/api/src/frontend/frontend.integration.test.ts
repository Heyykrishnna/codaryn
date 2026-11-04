import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Pool } from "pg";
import { FrontendService } from "./service.js";

function createMockPool(workspaceId: string, jobId: string): Pool {
  const components = [
    {
      id: "comp:src/Button.tsx:function:Button:3:8",
      name: "Button",
      path: "src/Button.tsx",
      kind: "function",
      export_type: "named",
      props: [{ name: "label", type: "string", required: true }],
      hooks_count: 1,
      rendered_components_count: 0,
      source_evidence: { path: "src/Button.tsx", startLine: 3, endLine: 7 },
    },
    {
      id: "comp:src/Card.tsx:function:Card:4:8",
      name: "Card",
      path: "src/Card.tsx",
      kind: "function",
      export_type: "default",
      props: [],
      hooks_count: 0,
      rendered_components_count: 1,
      source_evidence: { path: "src/Card.tsx", startLine: 4, endLine: 12 },
    },
  ];

  const jsxElements = [
    {
      id: "jsx:src/Card.tsx:Button:7:8",
      source_component_id: "comp:src/Card.tsx:function:Card:4:8",
      target_component_name: "Button",
      target_component_id: "comp:src/Button.tsx:function:Button:3:8",
      props: ["label"],
      is_conditional: false,
      source_evidence: { path: "src/Card.tsx", startLine: 7, endLine: 7 },
    },
  ];

  const hooks = [
    {
      id: "hook:src/Button.tsx:useState:4:18",
      component_id: "comp:src/Button.tsx:function:Button:3:8",
      name: "useState",
      kind: "state",
      dependencies: null,
      source_evidence: { path: "src/Button.tsx", startLine: 4, endLine: 4 },
    },
  ];

  const contexts = [
    {
      id: "ctx:src/ThemeContext.tsx:ThemeContext:3:14",
      name: "ThemeContext",
      path: "src/ThemeContext.tsx",
      default_value: "'light'",
      provider_component_ids: ["comp:src/Card.tsx:function:Card:4:8"],
      consumer_component_ids: ["comp:src/Button.tsx:function:Button:3:8"],
      source_evidence: {
        path: "src/ThemeContext.tsx",
        startLine: 3,
        endLine: 3,
      },
    },
  ];

  const routes = [
    {
      id: "route:nextjs_app:app/dashboard/page.tsx:/dashboard",
      framework: "nextjs_app",
      route_path: "/dashboard",
      path: "app/dashboard/page.tsx",
      component_name: "DashboardPage",
      component_id: null,
      dynamic_params: [],
      is_layout: false,
      source_evidence: {
        path: "app/dashboard/page.tsx",
        startLine: 1,
        endLine: 10,
      },
    },
  ];

  const state = [
    {
      id: "state:src/Button.tsx:local:count:4:10",
      component_id: "comp:src/Button.tsx:function:Button:3:8",
      kind: "local",
      identifier: "count",
      initial_value: "0",
      source_evidence: { path: "src/Button.tsx", startLine: 4, endLine: 4 },
    },
  ];

  const apiClients = [
    {
      id: "api:src/Button.tsx:fetch:GET:/api/counter:5:10",
      component_id: "comp:src/Button.tsx:function:Button:3:8",
      path: "src/Button.tsx",
      method: "GET",
      endpoint: "/api/counter",
      is_dynamic: false,
      client_type: "fetch",
      source_evidence: { path: "src/Button.tsx", startLine: 5, endLine: 5 },
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
      if (sql.includes("FROM analysis_frontend_components")) {
        if (sql.includes("AND id=$2")) {
          const compId = values?.[1];
          const found = components.find((c) => c.id === compId);
          return { rows: found ? [found] : [] };
        }
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(components.length) }] };
        }
        return { rows: components };
      }
      if (sql.includes("FROM analysis_frontend_jsx_elements")) {
        return { rows: jsxElements };
      }
      if (sql.includes("FROM analysis_frontend_hooks")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(hooks.length) }] };
        }
        return { rows: hooks };
      }
      if (sql.includes("FROM analysis_frontend_contexts")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(contexts.length) }] };
        }
        return { rows: contexts };
      }
      if (sql.includes("FROM analysis_frontend_routes")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(routes.length) }] };
        }
        if (sql.includes("SELECT DISTINCT framework")) {
          return { rows: [{ framework: "nextjs_app" }] };
        }
        return { rows: routes };
      }
      if (sql.includes("FROM analysis_frontend_state")) {
        if (sql.includes("SELECT DISTINCT kind")) {
          return { rows: [{ kind: "local" }] };
        }
        return { rows: state };
      }
      if (sql.includes("FROM analysis_frontend_api_clients")) {
        if (sql.includes("count(*) as count")) {
          return { rows: [{ count: String(apiClients.length) }] };
        }
        return { rows: apiClients };
      }
      return { rows: [] };
    },
  } as unknown as Pool;
}

test("FrontendService returns overview with component and route counts", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new FrontendService(pool);

  const overview = await service.getOverview(wsId, jId);
  assert.equal(overview.totalComponents, 2);
  assert.equal(overview.totalRoutes, 1);
  assert.equal(overview.totalHooks, 1);
  assert.equal(overview.totalContexts, 1);
  assert.equal(overview.totalApiClients, 1);
  assert.deepEqual(overview.detectedFrameworks, ["nextjs_app"]);
  assert.deepEqual(overview.stateManagementPatterns, ["local"]);
});

test("FrontendService returns components and component detail", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new FrontendService(pool);

  const list = await service.getComponents(wsId, jId);
  assert.equal(list.totalCount, 2);
  assert.equal(list.components[0]?.name, "Button");

  const detail = await service.getComponentDetail(
    wsId,
    jId,
    "comp:src/Button.tsx:function:Button:3:8",
  );
  assert.equal(detail.component.name, "Button");
  assert.equal(detail.hooks.length, 1);
  assert.equal(detail.state.length, 1);
  assert.equal(detail.apiCalls.length, 1);
  assert.equal(detail.incomingRenders.length, 1);
});

test("FrontendService returns routes, hooks, contexts, state, and api clients", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new FrontendService(pool);

  const routes = await service.getRoutes(wsId, jId);
  assert.equal(routes.totalCount, 1);
  assert.equal(routes.routes[0]?.routePath, "/dashboard");

  const hooks = await service.getHooks(wsId, jId);
  assert.equal(hooks.totalCount, 1);
  assert.equal(hooks.hooks[0]?.name, "useState");

  const contexts = await service.getContexts(wsId, jId);
  assert.equal(contexts.totalCount, 1);
  assert.equal(contexts.contexts[0]?.name, "ThemeContext");

  const state = await service.getState(wsId, jId);
  assert.equal(state.totalCount, 1);
  assert.equal(state.state[0]?.identifier, "count");

  const apiCalls = await service.getApiClients(wsId, jId);
  assert.equal(apiCalls.totalCount, 1);
  assert.equal(apiCalls.apiCalls[0]?.endpoint, "/api/counter");
});

test("FrontendService enforces tenant workspace isolation", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new FrontendService(pool);

  await assert.rejects(
    async () => service.getOverview("wrong-workspace", jId),
    /Analysis job not found in workspace/,
  );
});
