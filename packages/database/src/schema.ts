import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  unique,
  boolean,
  integer,
  jsonb,
  numeric,
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

export const analysisJobs = pgTable(
  "analysis_jobs",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    manifestId: uuid("manifest_id")
      .notNull()
      .references(() => analysisManifests.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    ref: text("ref").notNull(),
    commitSha: text("commit_sha").notNull(),
    status: text("status").notNull().default("queued"),
    currentStage: text("current_stage").notNull().default("inventory"),
    retries: integer("retries").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    failureReason: text("failure_reason"),
    fileCount: integer("file_count").notNull().default(0),
    symbolCount: integer("symbol_count").notNull().default(0),
    diagnosticCount: integer("diagnostic_count").notNull().default(0),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "analysis_jobs_commit_sha_check",
      sql`${table.commitSha} ~ '^[a-f0-9]{40}$'`,
    ),
    check(
      "analysis_jobs_status_check",
      sql`${table.status} IN ('queued','running','completed','failed','cancelled')`,
    ),
    check(
      "analysis_jobs_current_stage_check",
      sql`${table.currentStage} IN ('inventory','configuration','parsing','symbols','graph','frontend','diagnostics','completed')`,
    ),
    index("analysis_jobs_workspace_idx").on(
      table.organizationId,
      table.createdAt.desc(),
    ),
    index("analysis_jobs_repo_idx").on(
      table.repositoryId,
      table.createdAt.desc(),
    ),
    index("analysis_jobs_active_idx")
      .on(table.status)
      .where(sql`${table.status} IN ('queued', 'running')`),
  ],
);

export const analysisStages = pgTable(
  "analysis_stages",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    status: text("status").notNull().default("pending"),
    itemsTotal: integer("items_total").notNull().default(0),
    itemsCompleted: integer("items_completed").notNull().default(0),
    durationMs: integer("duration_ms"),
    message: text("message"),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "analysis_stages_stage_check",
      sql`${table.stage} IN ('inventory','configuration','parsing','symbols','graph','frontend','diagnostics','completed')`,
    ),
    check(
      "analysis_stages_status_check",
      sql`${table.status} IN ('pending','running','completed','failed','skipped')`,
    ),
    unique("analysis_stages_job_id_stage_key").on(table.jobId, table.stage),
  ],
);

export const analysisFiles = pgTable(
  "analysis_files",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    extension: text("extension").notNull(),
    language: text("language").notNull(),
    role: text("role").notNull(),
    sizeBytes: integer("size_bytes").notNull().default(0),
    linesOfCode: integer("lines_of_code").notNull().default(0),
    frameworks: jsonb("frameworks")
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    unique("analysis_files_job_id_path_key").on(table.jobId, table.path),
    index("analysis_files_job_path_idx").on(table.jobId, table.path),
  ],
);

export const analysisSymbols = pgTable(
  "analysis_symbols",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull(),
    location: jsonb("location").notNull(),
    createdAt: created(),
  },
  (table) => [
    check(
      "analysis_symbols_kind_check",
      sql`${table.kind} IN ('function','method','class','interface','typeAlias','import','export')`,
    ),
    index("analysis_symbols_job_kind_idx").on(table.jobId, table.kind),
    index("analysis_symbols_job_path_idx").on(table.jobId, table.path),
  ],
);

export const analysisDiagnostics = pgTable(
  "analysis_diagnostics",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    code: text("code").notNull(),
    severity: text("severity").notNull(),
    message: text("message").notNull(),
    location: jsonb("location"),
    createdAt: created(),
  },
  (table) => [
    check(
      "analysis_diagnostics_severity_check",
      sql`${table.severity} IN ('error','warning','info')`,
    ),
    index("analysis_diagnostics_job_severity_idx").on(
      table.jobId,
      table.severity,
    ),
  ],
);

export const analysisLogs = pgTable(
  "analysis_logs",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    stage: text("stage").notNull(),
    level: text("level").notNull(),
    message: text("message").notNull(),
    createdAt: created(),
  },
  (table) => [
    check(
      "analysis_logs_level_check",
      sql`${table.level} IN ('info','warn','error')`,
    ),
    index("analysis_logs_job_time_idx").on(table.jobId, table.createdAt),
  ],
);

export const analysisGraphNodes = pgTable(
  "analysis_graph_nodes",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    path: text("path").notNull(),
    name: text("name").notNull(),
    language: text("language"),
    linesOfCode: integer("lines_of_code"),
    createdAt: created(),
  },
  (table) => [
    check(
      "analysis_graph_nodes_kind_check",
      sql`${table.kind} IN ('file','symbol','module','external')`,
    ),
    index("analysis_graph_nodes_job_kind_idx").on(table.jobId, table.kind),
    index("analysis_graph_nodes_job_path_idx").on(table.jobId, table.path),
  ],
);

export const analysisGraphEdges = pgTable(
  "analysis_graph_edges",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    sourceId: text("source_id")
      .notNull()
      .references(() => analysisGraphNodes.id, { onDelete: "cascade" }),
    targetId: text("target_id")
      .notNull()
      .references(() => analysisGraphNodes.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    resolution: text("resolution").notNull(),
    evidence: jsonb("evidence")
      .notNull()
      .default(sql`'[]'::jsonb`),
    weight: integer("weight").notNull().default(1),
    createdAt: created(),
  },
  (table) => [
    check(
      "analysis_graph_edges_kind_check",
      sql`${table.kind} IN ('imports','exports','re_exports','calls','instantiates','extends','implements','references')`,
    ),
    check(
      "analysis_graph_edges_resolution_check",
      sql`${table.resolution} IN ('DIRECT','RESOLVED','INFERRED','PARTIAL','UNRESOLVED')`,
    ),
    index("analysis_graph_edges_job_source_idx").on(
      table.jobId,
      table.sourceId,
    ),
    index("analysis_graph_edges_job_target_idx").on(
      table.jobId,
      table.targetId,
    ),
    index("analysis_graph_edges_job_resolution_idx").on(
      table.jobId,
      table.resolution,
    ),
  ],
);

export const analysisGraphCycles = pgTable(
  "analysis_graph_cycles",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    length: integer("length").notNull(),
    nodeIds: jsonb("node_ids")
      .notNull()
      .default(sql`'[]'::jsonb`),
    path: jsonb("path")
      .notNull()
      .default(sql`'[]'::jsonb`),
    createdAt: created(),
  },
  (table) => [index("analysis_graph_cycles_job_idx").on(table.jobId)],
);

export const analysisGraphMetrics = pgTable(
  "analysis_graph_metrics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    afferentCoupling: integer("afferent_coupling").notNull().default(0),
    efferentCoupling: integer("efferent_coupling").notNull().default(0),
    instability: numeric("instability", { precision: 5, scale: 4 })
      .notNull()
      .default("0"),
    depth: integer("depth").notNull().default(0),
    createdAt: created(),
  },
  (table) => [
    unique("analysis_graph_metrics_job_path_key").on(table.jobId, table.path),
    index("analysis_graph_metrics_job_idx").on(table.jobId),
  ],
);

export const analysisUnresolvedReferences = pgTable(
  "analysis_unresolved_references",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    sourceFile: text("source_file").notNull(),
    sourceSymbolName: text("source_symbol_name").notNull(),
    localAlias: text("local_alias"),
    moduleSpecifier: text("module_specifier").notNull(),
    status: text("status").notNull(),
    evidence: jsonb("evidence").notNull(),
    createdAt: created(),
  },
  (table) => [
    check(
      "analysis_unresolved_refs_status_check",
      sql`${table.status} IN ('resolved','unresolved','ambiguous','external')`,
    ),
    index("analysis_unresolved_refs_job_status_idx").on(
      table.jobId,
      table.status,
    ),
  ],
);

export const analysisFrontendComponents = pgTable(
  "analysis_frontend_components",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull(),
    kind: text("kind").notNull(),
    exportType: text("export_type").notNull(),
    props: jsonb("props")
      .notNull()
      .default(sql`'[]'::jsonb`),
    hooksCount: integer("hooks_count").notNull().default(0),
    renderedComponentsCount: integer("rendered_components_count")
      .notNull()
      .default(0),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_frontend_components_job").on(table.jobId, table.name),
    index("idx_analysis_frontend_components_path").on(table.jobId, table.path),
  ],
);

export const analysisFrontendJsxElements = pgTable(
  "analysis_frontend_jsx_elements",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    sourceComponentId: text("source_component_id")
      .notNull()
      .references(() => analysisFrontendComponents.id, { onDelete: "cascade" }),
    targetComponentName: text("target_component_name").notNull(),
    targetComponentId: text("target_component_id").references(
      () => analysisFrontendComponents.id,
      { onDelete: "set null" },
    ),
    props: jsonb("props")
      .notNull()
      .default(sql`'[]'::jsonb`),
    isConditional: boolean("is_conditional").notNull().default(false),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_frontend_jsx_source").on(
      table.jobId,
      table.sourceComponentId,
    ),
  ],
);

export const analysisFrontendHooks = pgTable(
  "analysis_frontend_hooks",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    componentId: text("component_id")
      .notNull()
      .references(() => analysisFrontendComponents.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    dependencies: jsonb("dependencies"),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_frontend_hooks_comp").on(
      table.jobId,
      table.componentId,
    ),
  ],
);

export const analysisFrontendContexts = pgTable(
  "analysis_frontend_contexts",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull(),
    defaultValue: text("default_value"),
    providerComponentIds: jsonb("provider_component_ids")
      .notNull()
      .default(sql`'[]'::jsonb`),
    consumerComponentIds: jsonb("consumer_component_ids")
      .notNull()
      .default(sql`'[]'::jsonb`),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_frontend_contexts_job").on(table.jobId, table.name),
  ],
);

export const analysisFrontendRoutes = pgTable(
  "analysis_frontend_routes",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    framework: text("framework").notNull(),
    routePath: text("route_path").notNull(),
    path: text("path").notNull(),
    componentName: text("component_name"),
    componentId: text("component_id").references(
      () => analysisFrontendComponents.id,
      { onDelete: "set null" },
    ),
    dynamicParams: jsonb("dynamic_params")
      .notNull()
      .default(sql`'[]'::jsonb`),
    isLayout: boolean("is_layout").notNull().default(false),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_frontend_routes_path").on(table.jobId, table.routePath),
  ],
);

export const analysisFrontendState = pgTable(
  "analysis_frontend_state",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    componentId: text("component_id").notNull(),
    kind: text("kind").notNull(),
    identifier: text("identifier").notNull(),
    initialValue: text("initial_value"),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_frontend_state_comp").on(
      table.jobId,
      table.componentId,
    ),
  ],
);

export const analysisFrontendApiClients = pgTable(
  "analysis_frontend_api_clients",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    componentId: text("component_id").notNull(),
    path: text("path").notNull(),
    method: text("method").notNull(),
    endpoint: text("endpoint").notNull(),
    isDynamic: boolean("is_dynamic").notNull().default(false),
    clientType: text("client_type").notNull(),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_frontend_api_comp").on(table.jobId, table.componentId),
  ],
);
