import { test } from "node:test";
import { strict as assert } from "node:assert";
import { versionFileSchema, impactSchema } from "./comparison.js";
test("version contracts reject malformed hashes and negative impact depth", () => {
  assert.equal(
    versionFileSchema.safeParse({ path: "a.ts", hash: "bad" }).success,
    false,
  );
  assert.equal(
    impactSchema.safeParse({
      path: "a.ts",
      depth: -1,
      reason: "changed",
      via: null,
    }).success,
    false,
  );
});
