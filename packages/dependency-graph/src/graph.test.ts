import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DependencyGraphBuilder } from "./builder.js";
import { detectDependencyCycles } from "./cycles.js";
import { calculateModuleMetrics } from "./metrics.js";

describe("DependencyGraph", () => {
  const jobId = "018f3a2b-1111-7000-8000-000000000001";

  it("builds nodes, edges, and aggregates weights with source evidence", () => {
    const files = [
      { path: "src/a.ts", language: "typescript", linesOfCode: 50 },
      { path: "src/b.ts", language: "typescript", linesOfCode: 30 },
    ];

    const builder = new DependencyGraphBuilder(jobId, files);
    builder.addReferences([
      {
        id: "ref:1",
        sourceFile: "src/a.ts",
        sourceSymbolName: "bFunc",
        moduleSpecifier: "./b",
        targetFile: "src/b.ts",
        targetSymbolId: "sym:1",
        status: "resolved",
        evidence: { path: "src/a.ts", startLine: 1, endLine: 1 },
      },
      {
        id: "ref:2",
        sourceFile: "src/a.ts",
        sourceSymbolName: "bClass",
        moduleSpecifier: "./b",
        targetFile: "src/b.ts",
        targetSymbolId: "sym:2",
        status: "resolved",
        evidence: { path: "src/a.ts", startLine: 2, endLine: 2 },
      },
      {
        id: "ref:3",
        sourceFile: "src/a.ts",
        sourceSymbolName: "useState",
        moduleSpecifier: "react",
        targetFile: null,
        targetSymbolId: null,
        status: "external",
        evidence: { path: "src/a.ts", startLine: 3, endLine: 3 },
      },
    ]);

    const snapshot = builder.buildSnapshot();
    assert.equal(snapshot.totalNodes, 3);
    assert.equal(snapshot.totalEdges, 2);

    const abEdge = snapshot.edges.find(
      (e) =>
        e.sourceId === "node:file:src/a.ts" &&
        e.targetId === "node:file:src/b.ts",
    );
    assert.ok(abEdge);
    assert.equal(abEdge.weight, 2);
    assert.equal(abEdge.evidence.length, 2);
    assert.equal(abEdge.resolution, "RESOLVED");

    const reactEdge = snapshot.edges.find(
      (e) =>
        e.sourceId === "node:file:src/a.ts" && e.targetId === "node:ext:react",
    );
    assert.ok(reactEdge);
    assert.equal(reactEdge.resolution, "DIRECT");
  });

  it("detects circular dependencies using Tarjan SCC", () => {
    const adjacency = new Map<string, string[]>([
      ["a", ["b"]],
      ["b", ["a"]],
      ["c", ["a"]],
    ]);
    const pathMap = new Map([
      ["a", "src/a.ts"],
      ["b", "src/b.ts"],
      ["c", "src/c.ts"],
    ]);

    const cycles = detectDependencyCycles(jobId, adjacency, pathMap);
    assert.equal(cycles.length, 1);
    assert.equal(cycles[0]?.length, 2);
    assert.deepEqual(cycles[0]?.nodeIds, ["a", "b"]);
  });

  it("calculates module coupling and instability metrics", () => {
    const paths = ["src/a.ts", "src/b.ts", "src/c.ts"];
    const outgoing = new Map([
      ["src/a.ts", new Set(["src/b.ts"])],
      ["src/b.ts", new Set(["src/c.ts"])],
      ["src/c.ts", new Set<string>()],
    ]);
    const incoming = new Map([
      ["src/a.ts", new Set<string>()],
      ["src/b.ts", new Set(["src/a.ts"])],
      ["src/c.ts", new Set(["src/b.ts"])],
    ]);

    const metrics = calculateModuleMetrics(jobId, paths, outgoing, incoming);
    assert.equal(metrics.length, 3);

    const aMetric = metrics.find((m) => m.path === "src/a.ts");
    assert.ok(aMetric);
    assert.equal(aMetric.afferentCoupling, 0);
    assert.equal(aMetric.efferentCoupling, 1);
    assert.equal(aMetric.instability, 1);
    assert.equal(aMetric.depth, 2);

    const cMetric = metrics.find((m) => m.path === "src/c.ts");
    assert.ok(cMetric);
    assert.equal(cMetric.afferentCoupling, 1);
    assert.equal(cMetric.efferentCoupling, 0);
    assert.equal(cMetric.instability, 0);
    assert.equal(cMetric.depth, 0);
  });

  it("extracts bounded neighborhood graphs", () => {
    const files = [
      { path: "src/a.ts" },
      { path: "src/b.ts" },
      { path: "src/c.ts" },
      { path: "src/d.ts" },
    ];
    const builder = new DependencyGraphBuilder(jobId, files);
    builder.addReferences([
      {
        id: "ref:1",
        sourceFile: "src/a.ts",
        sourceSymbolName: "b",
        moduleSpecifier: "./b",
        targetFile: "src/b.ts",
        targetSymbolId: "sym:b",
        status: "resolved",
        evidence: { path: "src/a.ts", startLine: 1, endLine: 1 },
      },
      {
        id: "ref:2",
        sourceFile: "src/b.ts",
        sourceSymbolName: "c",
        moduleSpecifier: "./c",
        targetFile: "src/c.ts",
        targetSymbolId: "sym:c",
        status: "resolved",
        evidence: { path: "src/b.ts", startLine: 1, endLine: 1 },
      },
      {
        id: "ref:3",
        sourceFile: "src/c.ts",
        sourceSymbolName: "d",
        moduleSpecifier: "./d",
        targetFile: "src/d.ts",
        targetSymbolId: "sym:d",
        status: "resolved",
        evidence: { path: "src/c.ts", startLine: 1, endLine: 1 },
      },
    ]);

    const depth1 = builder.getNeighborhood("node:file:src/b.ts", 1, "outgoing");
    assert.equal(depth1.nodes.length, 2);
    assert.equal(depth1.edges.length, 1);

    const depth2 = builder.getNeighborhood("node:file:src/b.ts", 2, "both");
    assert.equal(depth2.nodes.length, 4);
    assert.equal(depth2.edges.length, 3);
  });
});
