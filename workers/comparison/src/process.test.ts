import { test } from "node:test";
import { strict as assert } from "node:assert";
import { extractVersion } from "@codaryn/version-engine";
test("comparison worker contract retains verification and canonical hash", () => {
  const result = extractVersion({ "a.ts": "export const a=1" }, null, true);
  assert.equal(result.snapshot.reuse.verification, "matched");
  assert.match(result.hash, /^[a-f0-9]{64}$/);
});
