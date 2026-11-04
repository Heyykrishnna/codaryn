import { test } from "node:test";
import { strict as assert } from "node:assert";
import { extractSql } from "./sql.js";
test("SQL parser preserves quoted values and ignores executable statements", () => {
  const result = extractSql([
    {
      path: "schema.sql",
      content:
        "CREATE TABLE users (id int PRIMARY KEY, label text DEFAULT 'UNIQUE'); SELECT dangerous();",
    },
  ]);
  assert.equal(result.tables[0].columns[1].unique, false);
  assert.equal(result.tables[0].columns[1].defaultValue, "'UNIQUE'");
  assert.equal(result.diagnostics[0].code, "SQL_UNSUPPORTED");
});

test("SQL in dollar-quoted procedures and nested comments is never treated as schema DDL", () => {
  const result = extractSql([
    {
      path: "migration.sql",
      content:
        "DO $$ BEGIN EXECUTE 'noop'; CREATE TABLE hidden (id int); END $$; /* outer /* inner */ CREATE TABLE hidden2(id int); */ CREATE TABLE visible (id int);",
    },
  ]);
  assert.deepEqual(
    result.tables.map((item) => item.name),
    ["visible"],
  );
});

test("referential actions preserve single and multi-word actions and unsupported table clauses are diagnostic", () => {
  const result = extractSql([
    {
      path: "schema.sql",
      content:
        "CREATE TABLE users(id int PRIMARY KEY, parent_id int REFERENCES users(id) ON DELETE CASCADE, owner_id int REFERENCES users(id) ON DELETE SET NULL, EXCLUDE USING gist (id WITH =));",
    },
  ]);
  assert.deepEqual(
    result.relations.map((item) => item.onDelete),
    ["CASCADE", "SET NULL"],
  );
  assert.equal(result.tables[0].columns.length, 3);
  assert.equal(result.diagnostics[0].code, "SQL_UNSUPPORTED");
});
