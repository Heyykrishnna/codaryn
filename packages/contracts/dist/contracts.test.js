import { test } from "node:test";
import { strict as assert } from "node:assert";
import { graphEdgeSchema, sourceEvidenceSchema, graphIdentity, } from "./index.js";
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
test("graph identities are stable and unambiguous", () => {
    const input = {
        repositoryId: "repo:1",
        commitSha: "a".repeat(40),
        kind: "function",
        path: "src/a.ts",
        symbol: "run",
        startLine: 1,
        startColumn: 1,
    };
    assert.equal(graphIdentity(input), graphIdentity({ ...input }));
    assert.notEqual(graphIdentity(input), graphIdentity({ ...input, symbol: "run:other" }));
    assert.throws(() => graphIdentity({ ...input, commitSha: "short" }));
});
