import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { z } from "zod";
const env = z.object({ DATABASE_URL: z.url() }).parse(process.env);
const pool = new Pool({ connectionString: env.DATABASE_URL });
try {
  const sql = await readFile(
    new URL("../migrations/0000_foundation.sql", import.meta.url),
    "utf8",
  );
  await pool.query(sql);
} finally {
  await pool.end();
}
