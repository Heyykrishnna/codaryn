import { Worker } from "bullmq";
import { drizzle } from "drizzle-orm/node-postgres";
import { Redis } from "ioredis";
import { createDatabasePool, foundationJobs, loadDatabaseEnvironment, } from "@codaryn/database";
import { z } from "zod";
loadDatabaseEnvironment();
const env = z
    .object({ DATABASE_URL: z.url(), REDIS_URL: z.url() })
    .parse(process.env);
const connection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
const pool = createDatabasePool();
const db = drizzle(pool);
const worker = new Worker("foundation", async (job) => {
    const id = z.string().min(1).parse(job.id);
    await db.insert(foundationJobs).values({ id }).onConflictDoNothing();
}, { connection });
worker.on("error", (error) => {
    console.error("Worker error:", error.message);
});
async function shutdown() {
    await worker.close();
    await connection.quit();
    await pool.end();
}
process.once("SIGTERM", () => {
    void shutdown();
});
process.once("SIGINT", () => {
    void shutdown();
});
