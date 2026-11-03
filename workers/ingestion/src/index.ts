import { Queue, Worker } from "bullmq";
import { Redis } from "ioredis";
import { createDatabasePool, loadDatabaseEnvironment } from "@codaryn/database";
import { z } from "zod";
import { GitHubClient } from "@codaryn/github";
import { processIngestion } from "./process.js";

loadDatabaseEnvironment();
const env = z
  .object({
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    GITHUB_APP_ID: z.string().min(1),
    GITHUB_APP_PRIVATE_KEY: z.string().min(1),
  })
  .parse(process.env);
const pool = createDatabasePool();
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const queue = new Queue("ingestion", { connection });
const github = new GitHubClient({
  appId: env.GITHUB_APP_ID,
  privateKey: env.GITHUB_APP_PRIVATE_KEY.replaceAll(String.raw`\n`, "\n"),
});
const worker = new Worker(
  "ingestion",
  async (job) => {
    await processIngestion(pool, github, z.uuid().parse(job.id));
  },
  { connection, concurrency: 1 },
);
worker.on("error", () => console.error("Ingestion worker failed"));
worker.on("failed", (job) => {
  console.error("Ingestion job failed");
  if (job?.id)
    void pool
      .query(
        "UPDATE ingestion_runs SET status='failed',error_code=COALESCE(error_code,'WORKER_FAILED') WHERE id=$1 AND status<>'completed'",
        [job.id],
      )
      .catch(() => console.error("Unable to persist ingestion failure"));
});
let stopping = false;
let pumping: Promise<void> | null = null;
async function pump() {
  const queued = await pool.query<{ id: string }>(
    "SELECT id FROM ingestion_runs WHERE status='queued' ORDER BY created_at LIMIT 100",
  );
  await queue.addBulk(
    queued.rows.map((job) => ({
      name: "ingest",
      data: {},
      opts: {
        jobId: job.id,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: { age: 86400 },
        removeOnFail: { age: 604800 },
      },
    })),
  );
}
const timer = setInterval(() => {
  if (!stopping && !pumping)
    pumping = pump()
      .catch(() => {
        console.error("Ingestion scheduling failed");
      })
      .finally(() => {
        pumping = null;
      });
}, 3000);
async function close() {
  stopping = true;
  clearInterval(timer);
  await pumping;
  await worker.close();
  await queue.close();
  await connection.quit();
  await pool.end();
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void close().catch(() => {
      console.error("Ingestion shutdown failed");
      process.exitCode = 1;
    });
  });
