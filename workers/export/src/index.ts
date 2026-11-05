import { createDatabasePool, loadDatabaseEnvironment } from "@codaryn/database";
import { runOneExportJob } from "./process.js";

loadDatabaseEnvironment();
const pool = createDatabasePool();

let running = true;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    running = false;
  });
}

async function loop() {
  while (running) {
    try {
      const processed = await runOneExportJob(pool);
      if (!processed) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  await pool.end();
}

void loop();
