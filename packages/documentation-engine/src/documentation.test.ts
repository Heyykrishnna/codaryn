import { test } from "node:test";
import { strict as assert } from "node:assert";
import { generateAllDocuments, generateDocument } from "./registry.js";
import { searchDocuments } from "./search.js";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

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
    contexts: [],
    hooks: [],
    apiClients: [
      {
        id: "client_user",
        endpoint: "/api/v1/user",
        method: "GET",
        filePath: "apps/web/api/user.ts",
        startLine: 10,
        endLine: 20,
      },
    ],
    connections: [],
  },
  backend: {
    routes: [
      {
        id: "route_user",
        method: "GET",
        path: "/api/v1/user",
        filePath: "apps/api/routes.ts",
        startLine: 15,
        endLine: 25,
      },
    ],
    controllers: [],
    services: [
      {
        id: "svc_user",
        name: "UserService",
        filePath: "apps/api/services/user.ts",
        startLine: 1,
        endLine: 50,
      },
    ],
    repositories: [],
    middleware: [],
    connections: [],
  },
  schema: {
    tables: [
      {
        name: "users",
        filePath: "schema.sql",
        startLine: 1,
        endLine: 20,
        columns: [
          { name: "id", dataType: "uuid", isPrimaryKey: true },
          { name: "email", dataType: "text" },
        ],
      },
    ],
    relations: [],
  },
  dependencies: {
    nodes: [{ id: "mod_index", path: "src/index.ts", name: "index.ts" }],
    edges: [],
  },
  execution: {
    functions: [
      {
        id: "fn_auth",
        name: "authenticateUser",
        filePath: "src/auth.ts",
        startLine: 1,
        endLine: 30,
        isExported: true,
      },
    ],
    calls: [],
  },
  infrastructure: {
    containers: [
      {
        name: "api",
        baseImage: "node:22-alpine",
        filePath: "Dockerfile",
        startLine: 1,
        endLine: 10,
      },
    ],
    composeServices: [],
    workflows: [],
  },
};

test("generateAllDocuments generates all ten canonical documents from snapshot", () => {
  const docs = generateAllDocuments(sampleSnapshot);
  assert.equal(docs.length, 10);

  for (const doc of docs) {
    assert.equal(doc.jobId, sampleSnapshot.jobId);
    assert.equal(doc.commitSha, sampleSnapshot.commitSha);
    assert.equal(doc.metadata.commitSha, sampleSnapshot.commitSha);
    assert.equal(doc.metadata.analyzerVersion, "1.0.0");
    assert.ok(doc.sections.length > 0);
    assert.ok(doc.markdown.length > 0);
  }
});

test("schema document retains column definitions and source evidence", () => {
  const schemaDoc = generateDocument("schema", sampleSnapshot);
  assert.equal(schemaDoc.templateId, "schema");
  assert.ok(schemaDoc.markdown.includes("Table: users"));
  assert.ok(schemaDoc.markdown.includes("schema.sql:1-20"));

  const userSection = schemaDoc.sections.find(
    (s) => s.id === "schema_table_users",
  );
  assert.ok(userSection);
  assert.equal(userSection.evidence.length, 1);
  assert.equal(userSection.evidence[0]?.path, "schema.sql");
});

test("searchDocuments locates relevant sections with snippets and evidence", () => {
  const docs = generateAllDocuments(sampleSnapshot);
  const results = searchDocuments(docs, {
    query: "authenticateUser",
    limit: 5,
  });

  assert.ok(results.length > 0);
  const match = results[0];
  assert.ok(match);
  assert.equal(match.templateId, "execution");
  assert.ok(match.snippet.includes("authenticateUser"));
  assert.ok(match.evidence);
  assert.equal(match.evidence.path, "src/auth.ts");
});
