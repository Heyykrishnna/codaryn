import { test } from "node:test";
import { strict as assert } from "node:assert";
import { compareVersions, extractVersion } from "./index.js";
test("comparison records graph/schema changes and transitive reverse impact including deleted files", () => {
  const original = {
      "a.ts": "export const a=1",
      "b.ts": "import {a} from './a'; export const b=a;",
      "c.ts": "import {b} from './b';",
      "schema.sql": "CREATE TABLE users(id integer);",
    },
    before = extractVersion(original).snapshot,
    after = extractVersion({
      ...original,
      "a.ts": "export const newer=2",
      "schema.sql": "CREATE TABLE users(id text, name text);",
    }).snapshot;
  const untouched = JSON.stringify(before),
    result = compareVersions(before, after);
  assert.ok(
    result.changes.some(
      (change) => change.object === "column" && change.kind === "changed",
    ),
  );
  assert.ok(
    result.changes.some(
      (change) => change.object === "symbol" && change.kind === "removed",
    ),
  );
  assert.equal(result.impact.find((item) => item.path === "c.ts")?.depth, 2);
  assert.equal(JSON.stringify(before), untouched);
  assert.deepEqual(compareVersions(before, before).changes, []);
});
test("dependency re-linking discovers new targets without stale edges and cycles terminate", () => {
  const before = extractVersion({ "a.ts": "import './b';" }).snapshot,
    after = extractVersion(
      { "a.ts": "import './b';", "b.ts": "import './a';" },
      before,
      true,
    ).snapshot;
  assert.equal(after.reuse.reused, 1);
  assert.equal(
    after.edges.filter((edge) => edge.resolution === "resolved").length,
    2,
  );
  assert.equal(compareVersions(before, after).impact.length, 2);
});
