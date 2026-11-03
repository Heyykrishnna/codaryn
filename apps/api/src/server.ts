import { GitHubClient } from "@codaryn/github";
import { registerRepositories } from "./repositories/routes.js";
import { z } from "zod";
import { createDatabasePool, loadDatabaseEnvironment } from "@codaryn/database";
import { createAuth } from "./identity/auth.js";
import { registerIdentity } from "./identity/routes.js";
import { buildApp } from "./app.js";
loadDatabaseEnvironment();
const environment = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    AUTH_BASE_URL: z.url(),
    WEB_ORIGIN: z.url(),
    GITHUB_CLIENT_ID: z.string().min(1),
    GITHUB_CLIENT_SECRET: z.string().min(1),
    GITHUB_APP_ID: z.string().optional(),
    GITHUB_APP_PRIVATE_KEY: z.string().optional(),
    GITHUB_APP_SLUG: z.string().optional(),
    GITHUB_WEBHOOK_SECRET: z.string().optional(),
    HOST: z.string().default("127.0.0.1"),
  })
  .parse(process.env);
const app = buildApp();
const pool = createDatabasePool();
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
const githubConfiguration = z
  .object({
    GITHUB_APP_ID: z.string().min(1),
    GITHUB_APP_PRIVATE_KEY: z.string().min(1),
    GITHUB_APP_SLUG: z.string().regex(/^[a-z0-9-]+$/),
    GITHUB_WEBHOOK_SECRET: z.string().min(32),
  })
  .safeParse(environment);
if (environment.GITHUB_APP_ID && !githubConfiguration.success)
  throw new Error("GitHub App configuration is incomplete");
registerRepositories(
  app,
  auth,
  pool,
  environment.WEB_ORIGIN,
  githubConfiguration.success
    ? {
        github: new GitHubClient({
          appId: githubConfiguration.data.GITHUB_APP_ID,
          privateKey:
            githubConfiguration.data.GITHUB_APP_PRIVATE_KEY.replaceAll(
              String.raw`\n`,
              "\n",
            ),
        }),
        slug: githubConfiguration.data.GITHUB_APP_SLUG,
        webhookSecret: githubConfiguration.data.GITHUB_WEBHOOK_SECRET,
      }
    : null,
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
