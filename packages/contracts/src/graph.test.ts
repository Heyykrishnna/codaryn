import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  dependencyNodeSchema,
  dependencyEdgeSchema,
  dependencyCycleSchema,
  moduleCouplingMetricSchema,
  resolvedSymbolReferenceSchema,
} from "./graph.js";

describe("graph contracts", () => {
  const jobId = "018f3a2b-1111-7000-8000-000000000001";

  it("validates dependency node schema", () => {
    const node = {
      id: "node:file:src/index.ts",
      jobId,
      kind: "file",
      path: "src/index.ts",
      name: "index.ts",
      language: "typescript",
      linesOfCode: 120,
    };
    const parsed = dependencyNodeSchema.parse(node);
    assert.equal(parsed.id, "node:file:src/index.ts");
    assert.equal(parsed.kind, "file");
  });

  it("enforces source evidence for resolved dependency edges", () => {
    const edgeWithoutEvidence = {
      id: "edge:1",
      jobId,
      sourceId: "node:file:src/a.ts",
      targetId: "node:file:src/b.ts",
      kind: "imports",
      resolution: "RESOLVED",
      evidence: [],
      weight: 1,
    };
    assert.throws(() => dependencyEdgeSchema.parse(edgeWithoutEvidence));

    const validEdge = {
      ...edgeWithoutEvidence,
      evidence: [{ path: "src/a.ts", startLine: 1, endLine: 1 }],
    };
    const parsed = dependencyEdgeSchema.parse(validEdge);
    assert.equal(parsed.resolution, "RESOLVED");
    assert.equal(parsed.evidence.length, 1);
  });

  it("validates dependency cycle schema", () => {
    const cycle = {
      id: "cycle:1",
      jobId,
      length: 2,
      nodeIds: ["node:file:src/a.ts", "node:file:src/b.ts"],
      path: ["src/a.ts", "src/b.ts", "src/a.ts"],
    };
    const parsed = dependencyCycleSchema.parse(cycle);
    assert.equal(parsed.length, 2);
    assert.equal(parsed.path.length, 3);
  });

  it("validates module coupling metric schema and instability bounds", () => {
    const metric = {
      jobId,
      path: "src/service.ts",
      afferentCoupling: 5,
      efferentCoupling: 2,
      instability: 2 / 7,
      depth: 3,
    };
    const parsed = moduleCouplingMetricSchema.parse(metric);
    assert.equal(parsed.depth, 3);
    assert.equal(parsed.afferentCoupling, 5);

    assert.throws(() =>
      moduleCouplingMetricSchema.parse({
        ...metric,
        instability: 1.5,
      }),
    );
  });

  it("validates resolved symbol reference schema", () => {
    const ref = {
      id: "ref:1",
      sourceFile: "src/consumer.ts",
      sourceSymbolName: "Button",
      localAlias: "PrimaryButton",
      moduleSpecifier: "./button",
      targetFile: "src/button.tsx",
      targetSymbolId: "sym:123",
      status: "resolved",
      evidence: { path: "src/consumer.ts", startLine: 2, endLine: 2 },
    };
    const parsed = resolvedSymbolReferenceSchema.parse(ref);
    assert.equal(parsed.status, "resolved");
    assert.equal(parsed.localAlias, "PrimaryButton");
  });
});
