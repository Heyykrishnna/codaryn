import { test } from "node:test";
import { strict as assert } from "node:assert";
import { WorkspaceAccessError } from "@codaryn/database";
import { DiagramService } from "./service.js";
import type { Pool } from "pg";

test("DiagramService.saveLayout validates and persists layout configuration", async () => {
  let executedInsert = false;

  const mockClient = {
    async query(sql: string, params?: unknown[]) {
      if (sql.includes("SELECT m.role")) {
        return { rowCount: 1, rows: [{ role: "admin" }] };
      }
      if (sql.includes("SELECT repository_id")) {
        return { rowCount: 1, rows: [{ repository_id: "repo_123" }] };
      }
      if (sql.includes("INSERT INTO saved_diagram_layouts")) {
        executedInsert = true;
        return { rowCount: 1 };
      }
      return { rows: [] };
    },
    release() {},
  };

  const mockPool = {
    async connect() {
      return mockClient;
    },
  } as unknown as Pool;

  const service = new DiagramService(mockPool);
  const layout = await service.saveLayout(
    "usr_123",
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000002",
    "system",
    "My Custom Layout",
    {
      zoom: 1.2,
      pan: { x: 50, y: 50 },
      positions: { node_1: { x: 100, y: 100 } },
    },
  );

  assert.equal(executedInsert, true);
  assert.equal(layout.name, "My Custom Layout");
  assert.equal(layout.diagramType, "system");
  assert.equal(layout.layoutConfig.zoom, 1.2);
});

test("DiagramService throws WorkspaceAccessError when user is not a member", async () => {
  const mockClient = {
    async query(sql: string) {
      if (sql.includes("SELECT m.role")) {
        return { rowCount: 0, rows: [] };
      }
      return { rows: [] };
    },
    release() {},
  };

  const mockPool = {
    async connect() {
      return mockClient;
    },
  } as unknown as Pool;

  const service = new DiagramService(mockPool);
  await assert.rejects(
    async () => {
      await service.getDiagram(
        "usr_outsider",
        "00000000-0000-0000-0000-000000000001",
        "00000000-0000-0000-0000-000000000002",
        "system",
      );
    },
    WorkspaceAccessError,
  );
});
