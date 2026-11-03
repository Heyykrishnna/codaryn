import { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { z } from "zod";
import { createAuth } from "./auth.js";
const env = z
  .object({
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    AUTH_BASE_URL: z.url(),
    WEB_ORIGIN: z.url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
  })
  .parse(process.env);
const pool = new Pool({ connectionString: env.DATABASE_URL });
try {
  const auth = createAuth(pool, {
    baseURL: env.AUTH_BASE_URL,
    origin: env.WEB_ORIGIN,
    secret: env.AUTH_SECRET,
    githubClientId: env.GITHUB_CLIENT_ID,
    githubClientSecret: env.GITHUB_CLIENT_SECRET,
  });
  const migration = await getMigrations(auth.options);
  await migration.runMigrations();
} finally {
  await pool.end();
}
