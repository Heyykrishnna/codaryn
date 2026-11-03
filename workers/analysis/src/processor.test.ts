import { test } from "node:test";
import { strict as assert } from "node:assert";
import type { Pool, PoolClient } from "pg";
import { AnalysisProcessor } from "./processor.js";

function createMockPool(initialStatus: string = "queued"): {
  pool: Pool;
  queries: { sql: string; values?: unknown[] }[];
  tables: {
    jobs: Record<string, unknown>[];
    stages: Record<string, unknown>[];
    files: Record<string, unknown>[];
    symbols: Record<string, unknown>[];
    diagnostics: Record<string, unknown>[];
    logs: Record<string, unknown>[];
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
    cycles: Record<string, unknown>[];
    metrics: Record<string, unknown>[];
    unresolved: Record<string, unknown>[];
  };
} {
  const queries: { sql: string; values?: unknown[] }[] = [];
  const tables = {
    jobs: [{ id: "job-1", status: initialStatus, retries: 0, max_retries: 3 }],
    stages: [] as Record<string, unknown>[],
    files: [] as Record<string, unknown>[],
    symbols: [] as Record<string, unknown>[],
    diagnostics: [] as Record<string, unknown>[],
    logs: [] as Record<string, unknown>[],
    nodes: [] as Record<string, unknown>[],
    edges: [] as Record<string, unknown>[],
    cycles: [] as Record<string, unknown>[],
    metrics: [] as Record<string, unknown>[],
    unresolved: [] as Record<string, unknown>[],
  };

  const client = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql, values });
      if (sql.includes("SELECT status FROM analysis_jobs")) {
        const job = tables.jobs.find((j) => j.id === values?.[0]);
        return { rows: job ? [{ status: job.status }] : [] };
      }
      if (sql.includes("SELECT retries, max_retries FROM analysis_jobs")) {
        const job = tables.jobs.find((j) => j.id === values?.[0]);
        return {
          rows: job
            ? [{ retries: job.retries, max_retries: job.max_retries }]
            : [],
        };
      }
      if (sql.includes("INSERT INTO analysis_files")) {
        tables.files.push({
          jobId: values?.[1],
          path: values?.[2],
          language: values?.[4],
          role: values?.[5],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("INSERT INTO analysis_symbols")) {
        tables.symbols.push({
          id: values?.[0],
          name: values?.[3],
          kind: values?.[4],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("INSERT INTO analysis_diagnostics")) {
        tables.diagnostics.push({
          id: values?.[0],
          code: values?.[3],
          severity: values?.[4],
          message: values?.[5],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("INSERT INTO analysis_stages")) {
        tables.stages.push({
          stage: values?.[2],
          status: "running",
        });
        return { rowCount: 1 };
      }
      if (sql.includes("INSERT INTO analysis_graph_nodes")) {
        tables.nodes.push({
          id: values?.[0],
          jobId: values?.[1],
          kind: values?.[2],
          path: values?.[3],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("INSERT INTO analysis_graph_edges")) {
        tables.edges.push({
          id: values?.[0],
          sourceId: values?.[2],
          targetId: values?.[3],
          kind: values?.[4],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("INSERT INTO analysis_graph_cycles")) {
        tables.cycles.push({
          id: values?.[0],
          length: values?.[2],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("INSERT INTO analysis_graph_metrics")) {
        tables.metrics.push({
          jobId: values?.[0],
          path: values?.[1],
          afferentCoupling: values?.[2],
          efferentCoupling: values?.[3],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("INSERT INTO analysis_unresolved_references")) {
        tables.unresolved.push({
          id: values?.[0],
          sourceFile: values?.[2],
          sourceSymbolName: values?.[3],
        });
        return { rowCount: 1 };
      }
      if (sql.includes("UPDATE analysis_jobs SET status='running'")) {
        tables.jobs[0].status = "running";
        return { rowCount: 1 };
      }
      if (sql.includes("UPDATE analysis_jobs SET status='completed'")) {
        tables.jobs[0].status = "completed";
        return { rowCount: 1 };
      }
      if (sql.includes("UPDATE analysis_jobs SET status='failed'")) {
        tables.jobs[0].status = "failed";
        return { rowCount: 1 };
      }
      return { rows: [], rowCount: 1 };
    },
    release: () => {},
  } as unknown as PoolClient;

  const pool = {
    connect: async () => client,
  } as unknown as Pool;

  return { pool, queries, tables };
}

test("AnalysisProcessor processes multi-project repository and extracts files and symbols", async () => {
  const { pool, tables } = createMockPool();
  const processor = new AnalysisProcessor(pool);

  const files = {
    "packages/core/src/calc.ts":
      "export function add(a: number, b: number): number { return a + b; }",
    "packages/ui/src/Card.tsx":
      "export function Card({ title }: { title: string }) { return <div>{title}</div>; }",
    "packages/ui/src/util.js":
      "export function format(v) { return String(v); }",
  };

  await processor.processJob({ jobId: "job-1", files });

  assert.equal(tables.jobs[0].status, "completed");
  assert.equal(tables.files.length, 3);
  assert.ok(tables.symbols.some((s) => s.name === "add"));
  assert.ok(tables.symbols.some((s) => s.name === "Card"));
  assert.ok(tables.symbols.some((s) => s.name === "format"));
});

test("AnalysisProcessor handles partial failures gracefully by logging diagnostics and continuing", async () => {
  const { pool, tables } = createMockPool();
  const processor = new AnalysisProcessor(pool);

  const files = {
    "src/valid.ts": "export function validFn(): void {}",
    "src/syntax-error.ts": "export function broken( { return 1;",
  };

  await processor.processJob({ jobId: "job-1", files });

  assert.equal(tables.jobs[0].status, "completed");
  assert.ok(tables.symbols.some((s) => s.name === "validFn"));
  assert.ok(tables.diagnostics.length > 0);
});

test("AnalysisProcessor respects job cancellation and halts processing immediately", async () => {
  const { pool, tables } = createMockPool("cancelled");
  const processor = new AnalysisProcessor(pool);

  const files = {
    "src/index.ts": "export const x = 1;",
  };

  await processor.processJob({ jobId: "job-1", files });

  assert.equal(tables.jobs[0].status, "cancelled");
  assert.equal(tables.symbols.length, 0);
});

test("AnalysisProcessor constructs dependency graph, detects cycles, and saves metrics", async () => {
  const { pool, tables } = createMockPool();
  const processor = new AnalysisProcessor(pool);

  const files = {
    "src/a.ts":
      "import { bFn } from './b'; export function aFn() { return bFn(); }",
    "src/b.ts":
      "import { aFn } from './a'; export function bFn() { return aFn(); }",
    "src/c.ts":
      "import { nonExistent } from './missing'; export function cFn() {}",
  };

  await processor.processJob({ jobId: "job-1", files });

  assert.equal(tables.jobs[0].status, "completed");
  assert.ok(tables.nodes.length >= 3);
  assert.ok(tables.edges.length >= 2);
  assert.equal(tables.cycles.length, 1);
  assert.equal(tables.metrics.length, 3);
  assert.ok(tables.unresolved.length >= 1);
  assert.ok(tables.stages.some((s) => s.stage === "graph"));
});
