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

test("configuration changes re-link aliases and identify affected importer modules", () => {
  const files = {
    "tsconfig.json":
      '{"compilerOptions":{"baseUrl":".","paths":{"@lib":["one.ts"]}}}',
    "one.ts": "export const value=1",
    "two.ts": "export const value=2",
    "consumer.ts": "import {value} from '@lib';",
  };
  const before = extractVersion(files).snapshot,
    after = extractVersion(
      {
        ...files,
        "tsconfig.json":
          '{"compilerOptions":{"baseUrl":".","paths":{"@lib":["two.ts"]}}}',
      },
      before,
      true,
    ).snapshot;
  assert.equal(before.edges[0].target, "one.ts");
  assert.equal(after.edges[0].target, "two.ts");
  assert.equal(after.reuse.invalidated, true);
  assert.equal(after.reuse.verification, "matched");
});

test("binding patterns and computed declaration names never retain embedded literals and malformed syntax is diagnostic", () => {
  const secret = "privateLiteralFixture999",
    result = extractVersion({
      "a.ts":
        "const {value='" +
        secret +
        "'}=input; class Example { ['" +
        secret +
        "']() {} }",
      "broken.ts": "export function broken( {",
    }).snapshot;
  assert.ok(!JSON.stringify(result).includes(secret));
  assert.ok(
    result.files.some((file) =>
      file.diagnostics.includes("DECLARATION_NAME_PARTIAL"),
    ),
  );
  assert.ok(
    result.files.some((file) => file.diagnostics.includes("SYNTAX_PARTIAL")),
  );
});

test("same-named declarations on one line keep distinct identities without line-number churn", () => {
  const source = "function one(){const x=1;} function two(){const x=2;}";
  const before = extractVersion({ "a.ts": source }).snapshot,
    after = extractVersion({ "a.ts": "\n" + source }).snapshot;
  const original = before.files[0].symbols;
  assert.equal(new Set(original.map((item) => item.id)).size, original.length);
  assert.deepEqual(
    after.files[0].symbols.map((item) => item.id),
    original.map((item) => item.id),
  );
});

test("per-file declaration work stops at the configured limit", () => {
  assert.throws(
    () =>
      extractVersion({
        "a.ts": Array.from(
          { length: 10001 },
          (_, index) => `const value${index}=0;`,
        ).join("\n"),
      }),
    /VERSION_LIMIT/,
  );
});

test("long archive-relative paths retain exact identity and resolve without label truncation", () => {
  const root = "nested/".repeat(40),
    snapshot = extractVersion({
      [root + "entry.ts"]: "import './dependency';",
      [root + "dependency.ts"]: "export const value=1;",
    }).snapshot;
  assert.equal(snapshot.edges[0].target, root + "dependency.ts");
});
