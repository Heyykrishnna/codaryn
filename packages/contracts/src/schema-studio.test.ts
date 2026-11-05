import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  schemaSnapshotSchema,
  schemaColumnSchema,
  schemaSnapshotSummarySchema,
} from "./schema-studio.js";
test("schema contracts reject invalid evidence, unbounded source data and unsupported lifecycle values", () => {
  assert.throws(() =>
    schemaColumnSchema.parse({
      id: "field",
      name: "name",
      type: "text",
      nullable: false,
      defaultValue: null,
      primaryKey: false,
      unique: false,
      evidence: { path: "schema.sql", startLine: 5, endLine: 2 },
    }),
  );
  assert.deepEqual(
    schemaSnapshotSchema.parse({
      version: 1,
      tables: [],
      relations: [],
      enums: [],
      lineage: [],
      diagnostics: [],
    }).tables,
    [],
  );
  assert.throws(() =>
    schemaSnapshotSummarySchema.parse({ id: "not-a-uuid", status: "ready" }),
  );
});
