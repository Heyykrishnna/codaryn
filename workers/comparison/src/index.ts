import { startArtifactPolling } from "@codaryn/artifact-worker";
import { z } from "zod";
import { createDatabasePool, loadDatabaseEnvironment } from "@codaryn/database";
import { GitHubClient } from "@codaryn/github";
import { runOneVersionRequest } from "./process.js";
loadDatabaseEnvironment();
const env = z
  .object({
    GITHUB_APP_ID: z.string().min(1),
    GITHUB_APP_PRIVATE_KEY: z.string().min(1),
  })
  .parse(process.env);
const pool = createDatabasePool();
const github = new GitHubClient({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY.replaceAll(String.raw`\n`, "\n"),
});
startArtifactPolling(
  pool,
  () => runOneVersionRequest(pool, github),
  "Comparison",
);
