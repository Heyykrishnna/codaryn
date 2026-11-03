import { z } from "zod";
import { Pool } from "pg";
import { createAuth } from "./identity/auth.js";
import { registerIdentity } from "./identity/routes.js";
import { buildApp } from "./app.js";
const environment = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    AUTH_BASE_URL: z.url(),
    WEB_ORIGIN: z.url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    HOST: z.string().default("127.0.0.1"),
  })
  .parse(process.env);
const app = buildApp();
const pool = new Pool({ connectionString: environment.DATABASE_URL });
const auth = createAuth(pool, {
  baseURL: environment.AUTH_BASE_URL,
  origin: environment.WEB_ORIGIN,
  secret: environment.AUTH_SECRET,
  githubClientId: environment.GITHUB_CLIENT_ID,
  githubClientSecret: environment.GITHUB_CLIENT_SECRET,
});
registerIdentity(
  app,
  auth,
  pool,
  environment.AUTH_BASE_URL,
  environment.WEB_ORIGIN,
);
app.addHook("onClose", async () => {
  await pool.end();
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void app.close();
  });
try {
  await app.listen({ port: environment.PORT, host: environment.HOST });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
