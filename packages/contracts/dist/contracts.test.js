import { test } from "node:test";
import { strict as assert } from "node:assert";
import { graphEdgeSchema, sourceEvidenceSchema } from "./index.js";
test("confirmed edges require evidence", () => {
    assert.equal(graphEdgeSchema.safeParse({
        id: "1",
        sourceId: "a",
        targetId: "b",
        kind: "IMPORTS",
        resolution: "DIRECT",
        evidence: [],
    }).success, false);
});
test("source ranges are ordered", () => {
    assert.equal(sourceEvidenceSchema.safeParse({ path: "x", startLine: 3, endLine: 2 })
        .success, false);
});
