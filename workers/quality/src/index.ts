import { z } from "zod";
import { createDatabasePool, loadDatabaseEnvironment } from "@codaryn/database";
import { GitHubClient } from "@codaryn/github";
import { startArtifactPolling } from "@codaryn/artifact-worker";
import { runOneQualityRequest } from "./process.js";
loadDatabaseEnvironment();
const env = z
  .object({
    GITHUB_APP_ID: z.string().min(1),
    GITHUB_APP_PRIVATE_KEY: z.string().min(1),
    SEMGREP_BINARY: z.string().optional(),
    OSV_SCANNER_BINARY: z.string().optional(),
    ALLOW_OSV_NETWORK: z.enum(["true", "false"]).default("false"),
  })
  .parse(process.env);
const pool = createDatabasePool(),
  github = new GitHubClient({
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replaceAll(String.raw`\n`, "\n"),
  });
startArtifactPolling(
  pool,
  () =>
    runOneQualityRequest(pool, github, {
      semgrepBinary: env.SEMGREP_BINARY,
      osvBinary: env.OSV_SCANNER_BINARY,
      allowOsv: env.ALLOW_OSV_NETWORK === "true",
    }),
  "Quality",
);
