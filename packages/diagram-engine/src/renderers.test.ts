import { test } from "node:test";
import { strict as assert } from "node:assert";
import { renderDiagram } from "./index.js";
import { renderMermaid } from "./mermaid.js";
import type { AnalysisSnapshotInput } from "./types.js";

const sampleSnapshot: AnalysisSnapshotInput = {
  jobId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  commitSha: "1234567890abcdef1234567890abcdef12345678",
  repositoryName: "acme/storefront",
  frontend: {
    components: [
      {
        id: "comp_home",
        name: "HomePage",
        filePath: "apps/web/pages/index.tsx",
        startLine: 1,
        endLine: 40,
        isPage: true,
        routePath: "/",
      },
      {
        id: "comp_button",
        name: "Button",
        filePath: "packages/ui/button.tsx",
        startLine: 5,
        endLine: 25,
      },
    ],
    routes: [
      {
        id: "route_home",
        path: "/",
        filePath: "apps/web/pages/index.tsx",
        startLine: 1,
        endLine: 40,
      },
    ],
    contexts: [
      {
        id: "ctx_auth",
        name: "AuthContext",
        filePath: "apps/web/context/auth.tsx",
        startLine: 10,
        endLine: 60,
      },
    ],
    hooks: [
      {
        id: "hook_user",
        name: "useUser",
        filePath: "apps/web/hooks/user.ts",
        startLine: 1,
        endLine: 20,
      },
    ],
    apiClients: [
      {
        id: "client_get_user",
        endpoint: "/api/v1/user",
        method: "GET",
        filePath: "apps/web/api/user.ts",
        startLine: 12,
        endLine: 24,
        resolvedEndpointId: "route_get_user",
      },
    ],
    connections: [
      {
        sourceId: "comp_home",
        targetId: "comp_button",
        kind: "renders",
        status: "DIRECT",
        evidence: {
          path: "apps/web/pages/index.tsx",
          startLine: 20,
          endLine: 20,
        },
      },
    ],
  },
  backend: {
    routes: [
      {
        id: "route_get_user",
        method: "GET",
        path: "/api/v1/user",
        controllerId: "ctrl_user",
        filePath: "apps/api/routes.ts",
        startLine: 15,
        endLine: 25,
      },
    ],
    controllers: [
      {
        id: "ctrl_user",
        name: "UserController",
        filePath: "apps/api/controllers/user.ts",
        startLine: 1,
        endLine: 50,
      },
    ],
    services: [
      {
        id: "svc_user",
        name: "UserService",
        filePath: "apps/api/services/user.ts",
        startLine: 1,
        endLine: 80,
      },
    ],
    repositories: [
      {
        id: "repo_user",
        name: "UserRepository",
        filePath: "apps/api/repositories/user.ts",
        startLine: 1,
        endLine: 45,
        modelName: "users",
      },
    ],
    middleware: [
      {
        id: "mw_auth",
        name: "authMiddleware",
        filePath: "apps/api/middleware/auth.ts",
        startLine: 1,
        endLine: 30,
      },
    ],
    connections: [
      {
        sourceId: "route_get_user",
        targetId: "ctrl_user",
        kind: "dispatches",
        status: "DIRECT",
        evidence: { path: "apps/api/routes.ts", startLine: 18, endLine: 18 },
      },
    ],
  },
  schema: {
    tables: [
      {
        name: "users",
        filePath: "packages/database/schema.sql",
        startLine: 1,
        endLine: 20,
        columns: [
          { name: "id", dataType: "uuid", isPrimaryKey: true },
          { name: "email", dataType: "text" },
        ],
      },
      {
        name: "workspaces",
        filePath: "packages/database/schema.sql",
        startLine: 25,
        endLine: 40,
        columns: [
          { name: "id", dataType: "uuid", isPrimaryKey: true },
          { name: "owner_id", dataType: "uuid" },
        ],
      },
    ],
    relations: [
      {
        id: "rel_users_workspaces",
        sourceTable: "workspaces",
        sourceColumn: "owner_id",
        targetTable: "users",
        targetColumn: "id",
        cardinality: "one_to_many",
        status: "DIRECT",
        evidence: {
          path: "packages/database/schema.sql",
          startLine: 35,
          endLine: 35,
        },
      },
    ],
  },
  dependencies: {
    nodes: [
      { id: "mod_index", path: "src/index.ts", name: "index.ts" },
      {
        id: "pkg_express",
        path: "node_modules/express",
        name: "express",
        isExternal: true,
      },
    ],
    edges: [
      {
        sourceId: "mod_index",
        targetId: "pkg_express",
        kind: "imports",
        status: "DIRECT",
        evidence: { path: "src/index.ts", startLine: 1, endLine: 1 },
      },
    ],
  },
  execution: {
    functions: [
      {
        id: "fn_main",
        name: "main",
        filePath: "src/main.ts",
        startLine: 1,
        endLine: 15,
        isExported: true,
      },
      {
        id: "fn_helper",
        name: "helper",
        filePath: "src/main.ts",
        startLine: 18,
        endLine: 30,
      },
    ],
    calls: [
      {
        id: "call_1",
        callerId: "fn_main",
        calleeId: "fn_helper",
        status: "DIRECT",
        evidence: { path: "src/main.ts", startLine: 5, endLine: 5 },
      },
    ],
  },
  infrastructure: {
    containers: [
      {
        name: "api-container",
        baseImage: "node:22-alpine",
        filePath: "Dockerfile",
        startLine: 1,
        endLine: 20,
      },
    ],
    composeServices: [
      {
        name: "web",
        image: "storefront-web",
        ports: ["3000:3000"],
        dependsOn: ["api"],
        filePath: "docker-compose.yml",
        startLine: 5,
        endLine: 15,
      },
      {
        name: "api",
        image: "storefront-api",
        ports: ["4000:4000"],
        filePath: "docker-compose.yml",
        startLine: 18,
        endLine: 28,
      },
    ],
    workflows: [
      {
        name: "ci",
        triggers: ["push", "pull_request"],
        jobs: ["build", "test"],
        filePath: ".github/workflows/ci.yml",
        startLine: 1,
        endLine: 50,
      },
    ],
  },
};

test("renderDiagram generates all supported diagram types from the same snapshot", () => {
  const types = [
    "system",
    "frontend",
    "backend",
    "api",
    "erd",
    "dependencies",
    "execution",
    "infrastructure",
  ] as const;

  for (const type of types) {
    const graph = renderDiagram(type, sampleSnapshot);
    assert.equal(graph.diagramType, type);
    assert.equal(graph.jobId, sampleSnapshot.jobId);
    assert.equal(graph.commitSha, sampleSnapshot.commitSha);
    assert.ok(graph.nodes.length > 0);
    assert.ok(graph.legend.length > 0);
    assert.ok(graph.metadata.nodeCount === graph.nodes.length);
  }
});

test("confirmed architecture claims preserve evidence and uncertain claims are labeled", () => {
  const erd = renderDiagram("erd", sampleSnapshot);
  const userTable = erd.nodes.find((n) => n.id === "tbl_users");
  assert.ok(userTable);
  assert.equal(userTable.status, "DIRECT");
  assert.ok(userTable.evidence);
  assert.equal(userTable.evidence?.path, "packages/database/schema.sql");

  const edge = erd.edges[0];
  assert.ok(edge);
  assert.equal(edge.status, "DIRECT");
  assert.ok(edge.evidence);

  const sys = renderDiagram("system", {
    ...sampleSnapshot,
    frontend: {
      ...sampleSnapshot.frontend!,
      apiClients: [
        {
          id: "c_unknown",
          endpoint: "/unmatched",
          method: "GET",
          filePath: "app.ts",
          startLine: 1,
          endLine: 5,
        },
      ],
    },
  });
  const sysEdge = sys.edges.find((e) => e.id === "edge_frontend_backend");
  assert.ok(sysEdge);
  assert.equal(sysEdge.status, "INFERRED");
});

test("renderMermaid generates valid flowchart and erDiagram markup", () => {
  const erd = renderDiagram("erd", sampleSnapshot);
  const erdMermaid = renderMermaid(erd);
  assert.ok(erdMermaid.startsWith("erDiagram"));
  assert.ok(erdMermaid.includes("tbl_users"));

  const sys = renderDiagram("system", sampleSnapshot);
  const sysMermaid = renderMermaid(sys);
  assert.ok(sysMermaid.startsWith("flowchart TD"));
  assert.ok(sysMermaid.includes("sys_frontend"));
  assert.ok(sysMermaid.includes("classDef direct"));
});
