import { getMigrations } from "better-auth/db/migration";
import { createDatabasePool } from "@codaryn/database";
import { authPersistenceOptions } from "./persistence.js";
const pool = createDatabasePool(true);
try {
  const migration = await getMigrations(authPersistenceOptions(pool));
  if (process.argv.includes("--check")) {
    if (migration.toBeCreated.length || migration.toBeAdded.length)
      throw new Error("Authentication schema has unapplied migrations");
    console.log("Authentication schema is synchronized");
  } else {
    await migration.runMigrations();
    console.log("Authentication migrations applied");
  }
} finally {
  await pool.end();
}
