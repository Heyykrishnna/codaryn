import { registerQuality } from "./quality/routes.js";
import { QualityService } from "./quality/service.js";
import { registerExecution } from "./execution/routes.js";
import { ExecutionService } from "./execution/service.js";
import { registerSchema } from "./schema/routes.js";
import { SchemaService } from "./schema/service.js";
import { registerStudio } from "./studio/routes.js";
import { StudioService } from "./studio/service.js";
import { registerAnalysis } from "./analysis/routes.js";
import { AnalysisService } from "./analysis/service.js";
import { registerGraph } from "./graph/routes.js";
import { GraphService } from "./graph/service.js";
import { registerFrontend } from "./frontend/routes.js";
import { FrontendService } from "./frontend/service.js";
import { registerBackend } from "./backend/routes.js";
import { BackendService } from "./backend/service.js";
import { RepositoryService } from "./repositories/service.js";
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
const github = githubConfiguration.success
  ? new GitHubClient({
      appId: githubConfiguration.data.GITHUB_APP_ID,
      privateKey: githubConfiguration.data.GITHUB_APP_PRIVATE_KEY.replaceAll(
        String.raw`\n`,
        "\n",
      ),
    })
  : null;
registerRepositories(
  app,
  auth,
  pool,
  environment.WEB_ORIGIN,
  github && githubConfiguration.success
    ? {
        github,
        slug: githubConfiguration.data.GITHUB_APP_SLUG,
        webhookSecret: githubConfiguration.data.GITHUB_WEBHOOK_SECRET,
      }
    : null,
);
registerStudio(
  app,
  auth,
  new StudioService(pool, github ? new RepositoryService(pool, github) : null),
  environment.WEB_ORIGIN,
);
registerAnalysis(app, auth, new AnalysisService(pool), environment.WEB_ORIGIN);
registerGraph(app, auth, new GraphService(pool), environment.WEB_ORIGIN);
registerFrontend(app, auth, new FrontendService(pool), environment.WEB_ORIGIN);
registerBackend(app, auth, new BackendService(pool), environment.WEB_ORIGIN);
registerQuality(
  app,
  auth,
  new QualityService(pool, process.env.ALLOW_OSV_NETWORK === "true"),
  environment.WEB_ORIGIN,
);
registerExecution(
  app,
  auth,
  new ExecutionService(pool),
  environment.WEB_ORIGIN,
);
registerSchema(app, auth, new SchemaService(pool), environment.WEB_ORIGIN);
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
