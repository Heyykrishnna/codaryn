import { createDatabasePool } from "./client.js";
import { applyMigrations } from "./migrations.js";
const pool = createDatabasePool(true);
try {
  await applyMigrations(pool);
  console.log("Application migrations applied");
} finally {
  await pool.end();
}
