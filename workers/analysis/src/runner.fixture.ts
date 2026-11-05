import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import { runOneAnalysisJob } from "./runner.js";
const url = new URL(process.env.DATABASE_URL ?? "");
if (url.hostname !== "127.0.0.1")
  throw new Error(
    "Worker interruption fixtures require a disposable loopback database",
  );
const pool = new Pool({ connectionString: url.toString() });
await runOneAnalysisJob(pool, {
  resolve: async () => "a".repeat(40),
  archive: async () => {
    process.send?.({ claimed: true });
    await new Promise<void>(() => undefined);
    return readFile("unreachable-fixture");
  },
});
await pool.end();
