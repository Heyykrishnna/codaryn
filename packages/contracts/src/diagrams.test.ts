import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  diagramGraphSchema,
  diagramLayoutConfigSchema,
  diagramNodeSchema,
  diagramTypeSchema,
  savedDiagramLayoutSchema,
} from "./diagrams.js";

test("diagram type schema accepts valid types and rejects unknown types", () => {
  assert.equal(diagramTypeSchema.safeParse("system").success, true);
  assert.equal(diagramTypeSchema.safeParse("frontend").success, true);
  assert.equal(diagramTypeSchema.safeParse("backend").success, true);
  assert.equal(diagramTypeSchema.safeParse("api").success, true);
  assert.equal(diagramTypeSchema.safeParse("erd").success, true);
  assert.equal(diagramTypeSchema.safeParse("dependencies").success, true);
  assert.equal(diagramTypeSchema.safeParse("execution").success, true);
  assert.equal(diagramTypeSchema.safeParse("infrastructure").success, true);
  assert.equal(diagramTypeSchema.safeParse("unknown").success, false);
});

test("diagram node schema requires valid resolution status and bounded properties", () => {
  const valid = {
    id: "node-1",
    label: "AuthService",
    kind: "service",
    group: "backend",
    status: "RESOLVED",
    evidence: { path: "src/auth.ts", startLine: 10, endLine: 45 },
    properties: { framework: "fastify" },
  };
  assert.equal(diagramNodeSchema.safeParse(valid).success, true);

  const invalid = {
    id: "",
    label: "Invalid",
    kind: "service",
    status: "NONEXISTENT",
  };
  assert.equal(diagramNodeSchema.safeParse(invalid).success, false);
});

test("diagram layout config schema enforces coordinate and zoom bounds", () => {
  const valid = {
    zoom: 1.5,
    pan: { x: 100, y: -50 },
    positions: { "node-1": { x: 200, y: 150 } },
    collapsedGroups: ["backend"],
    engine: "dagre" as const,
  };
  assert.equal(diagramLayoutConfigSchema.safeParse(valid).success, true);

  const outOfBounds = {
    zoom: 50,
    pan: { x: NaN, y: 0 },
    positions: {},
    collapsedGroups: [],
    engine: "dagre",
  };
  assert.equal(diagramLayoutConfigSchema.safeParse(outOfBounds).success, false);
});

test("saved diagram layout schema validates uuid and timestamp fields", () => {
  const valid = {
    id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    diagramType: "system" as const,
    name: "Default Architecture View",
    layoutConfig: {
      zoom: 1,
      pan: { x: 0, y: 0 },
      positions: {},
      collapsedGroups: [],
      engine: "dagre" as const,
    },
    createdAt: "2026-11-05T12:00:00.000Z",
    updatedAt: "2026-11-05T12:00:00.000Z",
    actorId: "usr_123",
  };
  assert.equal(savedDiagramLayoutSchema.safeParse(valid).success, true);
});

test("diagram graph schema validates complete snapshot graph structure", () => {
  const graph = {
    diagramType: "erd" as const,
    jobId: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    commitSha: "a".repeat(40),
    nodes: [
      {
        id: "tbl_users",
        label: "users",
        kind: "table",
        status: "DIRECT" as const,
        evidence: { path: "schema.sql", startLine: 1, endLine: 15 },
        properties: {},
      },
    ],
    edges: [],
    legend: [
      {
        category: "node" as const,
        key: "table",
        label: "Database Table",
        description: "Persisted relational table",
      },
    ],
    metadata: {
      generatedAt: "2026-11-05T12:00:00.000Z",
      nodeCount: 1,
      edgeCount: 0,
      analyzerVersion: "1.0.0",
      uncertaintiesCount: 0,
    },
  };
  assert.equal(diagramGraphSchema.safeParse(graph).success, true);
});
