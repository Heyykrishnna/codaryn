import { test } from "node:test";
import { strict as assert } from "node:assert";
import { extractDrizzle } from "./drizzle.js";
test("Drizzle reports dynamic declarations and handles declared composite keys", () => {
  const result = extractDrizzle(
    "schema.ts",
    `import {pgTable,integer,primaryKey} from 'drizzle-orm/pg-core';
 const dynamic=pgTable(computeName(),readColumns());
 const members=pgTable('members',{user:integer('user_id'),group:integer('group_id')},t=>[primaryKey({columns:[t.user,t.group]})]);`,
  );
  assert.equal(result.tables.length, 1);
  assert.deepEqual(result.tables[0].constraints[0].columns, [
    "user_id",
    "group_id",
  ]);
  assert.equal(result.diagnostics[0].code, "DRIZZLE_DYNAMIC");
});
