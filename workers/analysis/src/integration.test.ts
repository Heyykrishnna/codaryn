import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {}
  try {
    process.loadEnvFile(new URL("../../../.env", import.meta.url));
  } catch {}
}

const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;

test(
  "worker persists a queued foundation job",
  { timeout: 30000 },
  async () => {
    assert.ok(databaseUrl, "DATABASE_URL is required");
    assert.ok(redisUrl, "REDIS_URL is required");
    const id = randomUUID();
    const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
    const queue = new Queue("foundation", { connection });
    const events = new QueueEvents("foundation", { connection });
    const pool = new Pool({ connectionString: databaseUrl });
    const worker = spawn(
      process.execPath,
      [new URL("./index.js", import.meta.url).pathname],
      { env: process.env, stdio: "ignore" },
    );
    try {
      await events.waitUntilReady();
      const job = await queue.add("foundation", {}, { jobId: id, attempts: 2 });
      await job.waitUntilFinished(events, 20000);
      const result = await pool.query(
        "SELECT id FROM foundation_jobs WHERE id = $1",
        [id],
      );
      assert.equal(result.rowCount, 1);
      await job.remove();
    } finally {
      worker.kill("SIGTERM");
      if (worker.exitCode === null && worker.signalCode === null)
        await once(worker, "exit");
      await pool.query("DELETE FROM foundation_jobs WHERE id = $1", [id]);
      await pool.end();
      await events.close();
      await queue.close();
      await connection.quit();
    }
  },
);
