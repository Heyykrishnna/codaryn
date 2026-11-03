import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  unique,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
const created = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const users = pgTable("app_users", {
  id: text("id").primaryKey(),
  createdAt: created(),
});
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "organizations_name_check",
      sql`length(trim(${table.name})) BETWEEN 1 AND 100`,
    ),
  ],
);
export const memberships = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role").notNull(),
    createdAt: created(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.userId] }),
    index("organization_members_user_idx").on(table.userId),
    check(
      "organization_members_role_check",
      sql`${table.role} IN ('owner','admin','member')`,
    ),
  ],
);
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "restrict" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetId: text("target_id").notNull(),
    createdAt: created(),
  },
  (table) => [
    index("audit_events_organization_time_idx").on(
      table.organizationId,
      table.createdAt.desc(),
    ),
  ],
);
export const identityAuditEvents = pgTable(
  "identity_audit_events",
  {
    id: uuid("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    createdAt: created(),
  },
  (table) => [
    index("identity_audit_user_idx").on(table.userId, table.createdAt.desc()),
  ],
);
export const invitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  },
  (table) => [
    index("workspace_invitations_recipient_idx").on(table.recipientId),
    check(
      "workspace_invitations_role_check",
      sql`${table.role} IN ('admin','member')`,
    ),
  ],
);
export const preferences = pgTable("workspace_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),
});
export const installations = pgTable("github_installations", {
  id: bigint("id", { mode: "bigint" }).primaryKey(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  connected: boolean("connected").notNull().default(true),
  generation: integer("generation").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const repositories = pgTable(
  "connected_repositories",
  {
    id: uuid("id").primaryKey(),
    installationId: bigint("installation_id", { mode: "bigint" })
      .notNull()
      .references(() => installations.id),
    githubId: bigint("github_id", { mode: "bigint" }).notNull(),
    fullName: text("full_name").notNull(),
    private: boolean("private").notNull(),
    defaultBranch: text("default_branch").notNull(),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    unique("connected_repositories_installation_id_github_id_key").on(
      table.installationId,
      table.githubId,
    ),
  ],
);
export const ingestionRuns = pgTable(
  "ingestion_runs",
  {
    id: uuid("id").primaryKey(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    commitSha: text("commit_sha").notNull(),
    installationGeneration: integer("installation_generation").notNull(),
    status: text("status").notNull(),
    inventory: jsonb("inventory"),
    errorCode: text("error_code"),
    createdAt: created(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "ingestion_runs_commit_sha_check",
      sql`${table.commitSha} ~ '^[a-f0-9]{40}$'`,
    ),
    check(
      "ingestion_runs_status_check",
      sql`${table.status} IN ('queued','running','completed','failed')`,
    ),
    index("ingestion_runs_repo_idx").on(
      table.repositoryId,
      table.createdAt.desc(),
    ),
    index("ingestion_runs_queued_idx")
      .on(table.status)
      .where(sql`${table.status}='queued'`),
  ],
);
export const webhookEvents = pgTable("github_webhook_events", {
  deliveryId: uuid("delivery_id").primaryKey(),
  event: text("event").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const migrations = pgTable("schema_migrations", {
  name: text("name").primaryKey(),
  checksum: text("checksum").notNull(),
  appliedAt: timestamp("applied_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const analysisProfiles = pgTable(
  "analysis_profiles",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    revision: integer("revision").notNull(),
    configuration: jsonb("configuration").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "analysis_profiles_name_check",
      sql`length(trim(${table.name})) BETWEEN 1 AND 100`,
    ),
    check("analysis_profiles_revision_check", sql`${table.revision} > 0`),
    index("analysis_profiles_workspace_idx").on(
      table.organizationId,
      table.updatedAt.desc(),
    ),
  ],
);
export const analysisProfileVersions = pgTable(
  "analysis_profile_versions",
  {
    id: uuid("id").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => analysisProfiles.id, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    configuration: jsonb("configuration").notNull(),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: created(),
  },
  (table) => [
    check(
      "analysis_profile_versions_revision_check",
      sql`${table.revision} > 0`,
    ),
    unique("analysis_profile_versions_profile_id_revision_key").on(
      table.profileId,
      table.revision,
    ),
  ],
);
export const analysisManifests = pgTable(
  "analysis_manifests",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    manifest: jsonb("manifest").notNull(),
    hash: text("hash").notNull(),
    status: text("status").notNull().default("configured"),
    createdAt: created(),
  },
  (table) => [
    check(
      "analysis_manifests_hash_check",
      sql`${table.hash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "analysis_manifests_status_check",
      sql`${table.status} = 'configured'`,
    ),
    index("analysis_manifests_workspace_idx").on(
      table.organizationId,
      table.createdAt.desc(),
    ),
  ],
);
