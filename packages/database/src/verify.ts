import { getTableConfig } from "drizzle-orm/pg-core";
import { foundationJobs } from "./index.js";
import * as schema from "./schema.js";
import { migrationNames, migrationContent } from "./migrations.js";
import { createDatabasePool } from "./client.js";
const pool = createDatabasePool(true);
try {
  const actual = await pool.query<{
    table_name: string;
    column_name: string;
    is_nullable: string;
    udt_name: string;
  }>(
    "SELECT table_name,column_name,is_nullable,udt_name FROM information_schema.columns WHERE table_schema='public'",
  );
  const constraints = await pool.query<{
    table_name: string;
    conname: string;
    contype: string;
  }>(
    "SELECT c.relname AS table_name,k.conname,k.contype FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'",
  );
  const indexes = await pool.query<{ tablename: string; indexname: string }>(
    "SELECT tablename,indexname FROM pg_indexes WHERE schemaname='public'",
  );
  const failures: string[] = [];
  for (const table of [foundationJobs, ...Object.values(schema)]) {
    const expected = getTableConfig(table);
    const actualConstraints = constraints.rows.filter(
      (row) => row.table_name === expected.name,
    );
    if (
      actualConstraints.filter((row) => row.contype === "f").length !==
      expected.foreignKeys.length
    )
      failures.push(`${expected.name}: foreign key mismatch`);
    if (!actualConstraints.some((row) => row.contype === "p"))
      failures.push(`${expected.name}: missing primary key`);
    for (const constraint of expected.checks)
      if (!actualConstraints.some((row) => row.conname === constraint.name))
        failures.push(`${expected.name}: missing check ${constraint.name}`);
    for (const constraint of expected.uniqueConstraints)
      if (
        !actualConstraints.some((row) => row.conname === constraint.getName())
      )
        failures.push(`${expected.name}: missing unique constraint`);
    for (const index of expected.indexes)
      if (
        !indexes.rows.some(
          (row) =>
            row.tablename === expected.name &&
            row.indexname === index.config.name,
        )
      )
        failures.push(`${expected.name}: missing index ${index.config.name}`);
    for (const column of expected.columns) {
      const found = actual.rows.find(
        (row) =>
          row.table_name === expected.name && row.column_name === column.name,
      );
      if (!found) {
        failures.push(`${expected.name}.${column.name}: missing`);
        continue;
      }
      if (column.notNull && found.is_nullable !== "NO")
        failures.push(`${expected.name}.${column.name}: nullable`);
      const types: Record<string, string> = {
        text: "text",
        uuid: "uuid",
        bigint: "int8",
        integer: "int4",
        boolean: "bool",
        jsonb: "jsonb",
        "timestamp with time zone": "timestamptz",
      };
      if (types[column.getSQLType()] !== found.udt_name)
        failures.push(`${expected.name}.${column.name}: type mismatch`);
    }
  }
  const stored = await pool.query<{ name: string; checksum: string }>(
    "SELECT name,checksum FROM schema_migrations",
  );
  const expectedMigrations = await Promise.all(
    migrationNames.map(async (name) => ({
      name,
      ...(await migrationContent(name)),
    })),
  );
  for (const migration of expectedMigrations)
    if (
      !stored.rows.some(
        (row) =>
          row.name === migration.name && row.checksum === migration.checksum,
      )
    )
      failures.push(`${migration.name}: missing or different checksum`);
  if (failures.length) throw new Error(failures.join("\n"));
  console.log(
    "Application schema is synchronized: " +
      (Object.keys(schema).length + 1) +
      " tables verified",
  );
} finally {
  await pool.end();
}
