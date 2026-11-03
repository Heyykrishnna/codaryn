import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Pool } from "pg";
import { GraphService } from "./service.js";

function createMockPool(workspaceId: string, jobId: string): Pool {
  const nodes = [
    {
      id: "node:file:src/a.ts",
      job_id: jobId,
      kind: "file",
      path: "src/a.ts",
      name: "a.ts",
      language: "typescript",
      lines_of_code: 40,
    },
    {
      id: "node:file:src/b.ts",
      job_id: jobId,
      kind: "file",
      path: "src/b.ts",
      name: "b.ts",
      language: "typescript",
      lines_of_code: 35,
    },
    {
      id: "node:ext:react",
      job_id: jobId,
      kind: "external",
      path: "react",
      name: "react",
    },
  ];

  const edges = [
    {
      id: "edge:1",
      job_id: jobId,
      source_id: "node:file:src/a.ts",
      target_id: "node:file:src/b.ts",
      kind: "imports",
      resolution: "RESOLVED",
      evidence: [{ path: "src/a.ts", startLine: 1, endLine: 1 }],
      weight: 1,
    },
    {
      id: "edge:2",
      job_id: jobId,
      source_id: "node:file:src/b.ts",
      target_id: "node:file:src/a.ts",
      kind: "imports",
      resolution: "RESOLVED",
      evidence: [{ path: "src/b.ts", startLine: 1, endLine: 1 }],
      weight: 1,
    },
    {
      id: "edge:3",
      job_id: jobId,
      source_id: "node:file:src/a.ts",
      target_id: "node:ext:react",
      kind: "imports",
      resolution: "DIRECT",
      evidence: [{ path: "src/a.ts", startLine: 2, endLine: 2 }],
      weight: 1,
    },
  ];

  const cycles = [
    {
      id: "cycle:1",
      job_id: jobId,
      length: 2,
      node_ids: ["node:file:src/a.ts", "node:file:src/b.ts"],
      path: ["src/a.ts", "src/b.ts", "src/a.ts"],
    },
  ];

  const metrics = [
    {
      job_id: jobId,
      path: "src/a.ts",
      afferent_coupling: 1,
      efferent_coupling: 2,
      instability: "0.6667",
      depth: 1,
    },
    {
      job_id: jobId,
      path: "src/b.ts",
      afferent_coupling: 1,
      efferent_coupling: 1,
      instability: "0.5000",
      depth: 1,
    },
  ];

  const unresolved = [
    {
      id: "ref:1",
      job_id: jobId,
      source_file: "src/a.ts",
      source_symbol_name: "missingFunc",
      local_alias: null,
      module_specifier: "./missing",
      status: "unresolved",
      evidence: { path: "src/a.ts", startLine: 5, endLine: 5 },
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
      if (sql.includes("FROM analysis_graph_nodes")) {
        if (sql.includes("AND id = ANY")) {
          const ids = values?.[1] as string[];
          return { rows: nodes.filter((n) => ids.includes(n.id)) };
        }
        return { rows: nodes };
      }
      if (sql.includes("FROM analysis_graph_edges")) {
        return { rows: edges };
      }
      if (sql.includes("FROM analysis_graph_cycles")) {
        return { rows: cycles };
      }
      if (sql.includes("FROM analysis_graph_metrics")) {
        return { rows: metrics };
      }
      if (sql.includes("FROM analysis_unresolved_references")) {
        return { rows: unresolved };
      }
      return { rows: [] };
    },
  } as unknown as Pool;
}

test("GraphService returns snapshot with nodes, edges, cycles, and metrics", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new GraphService(pool);

  const snapshot = await service.getSnapshot(wsId, jId);
  assert.equal(snapshot.totalNodes, 3);
  assert.equal(snapshot.totalEdges, 3);
  assert.equal(snapshot.totalCycles, 1);
  assert.equal(snapshot.metrics.length, 2);
  assert.equal(snapshot.nodes[0]?.kind, "file");
});

test("GraphService returns neighborhood subgraph around center node", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new GraphService(pool);

  const result = await service.getNeighborhood(
    wsId,
    jId,
    "node:file:src/a.ts",
    1,
    "outgoing",
  );
  assert.ok(result.nodes.some((n) => n.id === "node:file:src/a.ts"));
  assert.ok(result.nodes.some((n) => n.id === "node:file:src/b.ts"));
});

test("GraphService lists circular dependency cycles", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new GraphService(pool);

  const res = await service.getCycles(wsId, jId);
  assert.equal(res.totalCycles, 1);
  assert.equal(res.cycles[0]?.length, 2);
});

test("GraphService returns unresolved references with source evidence", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new GraphService(pool);

  const res = await service.getUnresolvedReferences(wsId, jId);
  assert.equal(res.totalCount, 1);
  assert.equal(res.references[0]?.sourceSymbolName, "missingFunc");
  assert.equal(res.references[0]?.evidence.startLine, 5);
});

test("GraphService rejects cross-workspace access attempts", async () => {
  const wsId = "ws-1";
  const jId = "job-1";
  const pool = createMockPool(wsId, jId);
  const service = new GraphService(pool);

  await assert.rejects(
    async () => service.getSnapshot("wrong-ws", jId),
    /Analysis job not found in workspace/,
  );
});
