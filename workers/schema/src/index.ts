import { z } from "zod";
import { createDatabasePool, loadDatabaseEnvironment } from "@codaryn/database";
import { GitHubClient } from "@codaryn/github";
import { runOneSchemaRequest } from "./process.js";
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
let stopping = false;
let running: Promise<void> | null = null;
function pump() {
  if (stopping || running) return;
  running = runOneSchemaRequest(pool, github)
    .then(() => undefined)
    .catch(() => {
      console.error("Schema scheduling failed");
    })
    .finally(() => {
      running = null;
    });
}
const timer = setInterval(pump, 3000);
pump();
async function close() {
  stopping = true;
  clearInterval(timer);
  await running;
  await pool.end();
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    close().catch(() => {
      console.error("Schema shutdown failed");
      process.exitCode = 1;
    });
  });
