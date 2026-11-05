import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Pool, PoolClient } from "pg";
export const migrationNames = [
  "0000_foundation.sql",
  "0001_workspaces.sql",
  "0002_membership.sql",
  "0003_identity_audit.sql",
  "0004_repositories.sql",
  "0005_analysis_studio.sql",
  "0006_analysis_foundation.sql",
  "0007_dependency_graph.sql",
  "0008_frontend_intelligence.sql",
  "0009_backend_intelligence.sql",
  "0010_frontend_indexes.sql",
  "0011_schema_studio.sql",
];
export async function migrationContent(name: string) {
  const sql = await readFile(
    new URL(`../migrations/${name}`, import.meta.url),
    "utf8",
  );
  return { sql, checksum: createHash("sha256").update(sql).digest("hex") };
}
async function applyMigration(client: PoolClient, name: string) {
  const { sql, checksum } = await migrationContent(name);
  const previous = await client.query<{ checksum: string }>(
    "SELECT checksum FROM schema_migrations WHERE name=$1",
    [name],
  );
  if (previous.rows[0]) {
    if (previous.rows[0].checksum !== checksum)
      throw new Error(`Migration checksum mismatch: ${name}`);
    return;
  }
  await client.query(sql);
  await client.query(
    "INSERT INTO schema_migrations (name,checksum) VALUES ($1,$2)",
    [name, checksum],
  );
}
export async function applyMigrations(pool: Pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [863917042]);
    await client.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    await migrationNames.reduce(
      (previous, name) => previous.then(() => applyMigration(client, name)),
      Promise.resolve(),
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
