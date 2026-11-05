import { test } from "node:test";
import { strict as assert } from "node:assert";
import { qualityCoverageSchema, scannerStatusSchema } from "./quality.js";
test("quality contracts distinguish unavailable scanners from completed scans and reject impossible coverage", () => {
  assert.equal(
    scannerStatusSchema.safeParse({
      tool: "osv",
      status: "clean",
      message: "",
      checkedAt: null,
      version: "v1",
    }).success,
    false,
  );
  assert.equal(
    qualityCoverageSchema.safeParse({
      id: "c",
      path: "a.ts",
      format: "lcov",
      metric: "lines",
      covered: 2,
      total: 1,
      reportEvidence: { path: "lcov.info", startLine: 1, endLine: 3 },
    }).success,
    false,
  );
});
