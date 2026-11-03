import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { z } from "zod";

const env = z.object({ DATABASE_URL: z.url() }).parse(process.env);
const pool = new Pool({ connectionString: env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock($1)", [863917042]);
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  for (const migration of [
    "0000_foundation.sql",
    "0001_workspaces.sql",
    "0002_membership.sql",
    "0003_identity_audit.sql",
    "0004_repositories.sql",
  ]) {
    const sql = await readFile(
      new URL(`../migrations/${migration}`, import.meta.url),
      "utf8",
    );
    const checksum = createHash("sha256").update(sql).digest("hex");
    const previous = await client.query<{ checksum: string }>(
      "SELECT checksum FROM schema_migrations WHERE name = $1",
      [migration],
    );
    if (previous.rows.length) {
      if (previous.rows[0].checksum !== checksum)
        throw new Error(`Migration checksum mismatch: ${migration}`);
      continue;
    }
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
      [migration, checksum],
    );
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
