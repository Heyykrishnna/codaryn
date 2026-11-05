import { test } from "node:test";
import { strict as assert } from "node:assert";
import { executionCallSchema, executionSnapshotSchema } from "./execution.js";
test("execution contracts reject unsupported certainty and dangling resolution", () => {
  const call = {
    id: "c",
    sourceId: "f",
    targetId: null,
    expression: "dynamic()",
    kind: "call",
    resolution: "RESOLVED",
    reason: "",
    evidence: { path: "a.ts", startLine: 1, endLine: 1 },
  };
  assert.equal(executionCallSchema.safeParse(call).success, false);
  assert.equal(
    executionSnapshotSchema.safeParse({ semantics: "runtime-guaranteed" })
      .success,
    false,
  );
});
