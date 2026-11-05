import { test } from "node:test";
import { strict as assert } from "node:assert";
import { extractVersion, semanticVersion } from "./incremental.js";
test("unchanged artifacts are reused while add/change/delete reconcile exactly with a full run", () => {
  const files = {
    "a.ts": "export const a=1",
    "b.ts": "import {a} from './a'; export const b=a;",
    "old.ts": "export const old=1",
  };
  const baseline = extractVersion(files).snapshot;
  const next = {
    "a.ts": "export const a=2",
    "b.ts": files["b.ts"],
    "new.ts": "export const n=1",
  };
  const incremental = extractVersion(next, baseline, true).snapshot,
    full = extractVersion(next).snapshot;
  assert.equal(incremental.reuse.reused, 1);
  assert.equal(incremental.reuse.processed, 2);
  assert.equal(incremental.reuse.verification, "matched");
  assert.deepEqual(semanticVersion(incremental), semanticVersion(full));
  assert.equal(baseline.files.length, 3);
  assert.ok(!incremental.files.some((f) => f.path === "old.ts"));
});
test("configuration and analyzer versions invalidate cache and malformed artifacts are reprocessed", () => {
  const files = { "a.ts": "export const a=1", "tsconfig.json": "{}" };
  const base = extractVersion(files).snapshot;
  assert.equal(
    extractVersion(
      { ...files, "tsconfig.json": '{"compilerOptions":{"baseUrl":"src"}}' },
      base,
    ).snapshot.reuse.reused,
    0,
  );
  assert.equal(
    extractVersion(files, base, false, "next-version").snapshot.reuse.reused,
    0,
  );
  base.files[0].symbols = [];
  assert.equal(extractVersion(files, base).snapshot.reuse.processed, 1);
});
test("full verification detects poisoned global cache and falls back safely", () => {
  const files = { "a.sql": "CREATE TABLE users(id integer);" };
  const base = extractVersion(files).snapshot;
  base.schema = [];
  const result = extractVersion(files, base, true).snapshot;
  assert.equal(result.reuse.verification, "fallback-full");
  assert.ok(result.schema.length);
});
test("source literals and schema defaults are hashed without persisting source excerpts", () => {
  const secret = "privateFixtureCredential";
  const snapshot = extractVersion({
    "a.ts": "export const password='" + secret + "';",
    "a.sql": "CREATE TABLE users(id text DEFAULT '" + secret + "');",
  }).snapshot;
  assert.ok(!JSON.stringify(snapshot).includes(secret));
  assert.throws(() => extractVersion({ "../bad.ts": "" }));
  assert.throws(() =>
    extractVersion({ "a.ts": "a".repeat(2 * 1024 * 1024 + 1) }),
  );
});
