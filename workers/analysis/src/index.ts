import { z } from "zod";
import { createDatabasePool, loadDatabaseEnvironment } from "@codaryn/database";
import { GitHubClient } from "@codaryn/github";
import { startArtifactPolling } from "@codaryn/artifact-worker";
import { runOneAnalysisJob } from "./runner.js";
loadDatabaseEnvironment();
const env = z
    .object({
      GITHUB_APP_ID: z.string().min(1),
      GITHUB_APP_PRIVATE_KEY: z.string().min(1),
    })
    .parse(process.env),
  pool = createDatabasePool(),
  github = new GitHubClient({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replaceAll(String.raw`\n`, "\n"),
  });
startArtifactPolling(pool, () => runOneAnalysisJob(pool, github), "Analysis");
