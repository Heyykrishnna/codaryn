import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
export const foundationJobs = pgTable("foundation_jobs", {
  id: text("id").primaryKey(),
  completedAt: timestamp("completed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export { WorkspaceService, WorkspaceAccessError } from "./workspaces.js";
export type { Workspace, WorkspaceRole } from "./workspaces.js";
export {
  createDatabasePool,
  databasePoolOptions,
  loadDatabaseEnvironment,
} from "./client.js";

export * as applicationSchema from "./schema.js";
