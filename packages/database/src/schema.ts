import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  date,
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
      "analysis_unresolved_references_status_check",
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
    props: text("props")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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
    dependencies: text("dependencies").array(),
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
    providerComponentIds: text("provider_component_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    consumerComponentIds: text("consumer_component_ids")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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
    dynamicParams: text("dynamic_params")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
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

export const analysisBackendRoutes = pgTable(
  "analysis_backend_routes",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    framework: text("framework").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    filePath: text("file_path").notNull(),
    handlerName: text("handler_name").notNull(),
    handlerSymbolId: text("handler_symbol_id"),
    controllerName: text("controller_name"),
    middleware: text("middleware")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    isDynamic: boolean("is_dynamic").notNull().default(false),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_backend_routes_job_path").on(table.jobId, table.path),
    index("idx_analysis_backend_routes_job_method").on(
      table.jobId,
      table.method,
    ),
  ],
);

export const analysisBackendControllers = pgTable(
  "analysis_backend_controllers",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull(),
    framework: text("framework").notNull(),
    routesCount: integer("routes_count").notNull().default(0),
    basePath: text("base_path"),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_backend_controllers_job").on(table.jobId, table.name),
  ],
);

export const analysisBackendServices = pgTable(
  "analysis_backend_services",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull(),
    methods: text("methods")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    injectedDependencies: text("injected_dependencies")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_backend_services_job").on(table.jobId, table.name),
  ],
);

export const analysisBackendRepositories = pgTable(
  "analysis_backend_repositories",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull(),
    ormType: text("orm_type").notNull(),
    methods: text("methods")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_backend_repositories_job").on(table.jobId, table.name),
  ],
);

export const analysisBackendMiddleware = pgTable(
  "analysis_backend_middleware",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").notNull(),
    kind: text("kind").notNull(),
    scope: text("scope").notNull(),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_backend_middleware_job").on(table.jobId, table.name),
  ],
);

export const analysisBackendRequestFlows = pgTable(
  "analysis_backend_request_flows",
  {
    id: text("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    routeId: text("route_id")
      .notNull()
      .references(() => analysisBackendRoutes.id, { onDelete: "cascade" }),
    routePath: text("route_path").notNull(),
    httpMethod: text("http_method").notNull(),
    controllerName: text("controller_name"),
    serviceNames: text("service_names")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    repositoryNames: text("repository_names")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    middlewareChain: text("middleware_chain")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    sourceEvidence: jsonb("source_evidence")
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: created(),
  },
  (table) => [
    index("idx_analysis_backend_request_flows_job").on(
      table.jobId,
      table.routeId,
    ),
  ],
);

export const analysisSchemaSnapshots = pgTable(
  "analysis_schema_snapshots",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    commitSha: text("commit_sha").notNull(),
    installationGeneration: integer("installation_generation").notNull(),
    inferRelations: boolean("infer_relations").notNull().default(false),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    leaseId: uuid("lease_id"),
    leaseAt: timestamp("lease_at", { withTimezone: true }),
    snapshot: jsonb("snapshot"),
    hash: text("hash"),
    tableCount: integer("table_count").notNull().default(0),
    failureCode: text("failure_code"),
    createdAt: created(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "analysis_schema_snapshots_commit_sha_check",
      sql`${t.commitSha} ~ '^[a-f0-9]{40}$'`,
    ),
    check(
      "analysis_schema_snapshots_status_check",
      sql`${t.status} IN ('queued','running','completed','failed')`,
    ),
    check(
      "analysis_schema_snapshots_attempts_check",
      sql`${t.attempts} BETWEEN 0 AND 3`,
    ),
    check(
      "analysis_schema_snapshots_hash_check",
      sql`${t.hash} IS NULL OR ${t.hash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "analysis_schema_snapshots_table_count_check",
      sql`${t.tableCount} >= 0`,
    ),
    check(
      "analysis_schema_snapshots_completion_check",
      sql`(${t.status}='completed' AND ${t.snapshot} IS NOT NULL AND ${t.hash} IS NOT NULL) OR (${t.status}<>'completed' AND ${t.snapshot} IS NULL AND ${t.hash} IS NULL)`,
    ),
    index("analysis_schema_snapshots_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
    index("analysis_schema_snapshots_job_idx").on(t.jobId, t.createdAt.desc()),
    index("analysis_schema_snapshots_queue_idx").on(t.status, t.createdAt),
  ],
);

export const analysisExecutionSnapshots = pgTable(
  "analysis_execution_snapshots",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    commitSha: text("commit_sha").notNull(),
    installationGeneration: integer("installation_generation").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    leaseId: uuid("lease_id"),
    leaseAt: timestamp("lease_at", { withTimezone: true }),
    snapshot: jsonb("snapshot"),
    hash: text("hash"),
    functionCount: integer("function_count").notNull().default(0),
    failureCode: text("failure_code"),
    createdAt: created(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "analysis_execution_snapshots_commit_sha_check",
      sql`${t.commitSha} ~ '^[a-f0-9]{40}$'`,
    ),
    check(
      "analysis_execution_snapshots_status_check",
      sql`${t.status} IN ('queued','running','completed','failed')`,
    ),
    check(
      "analysis_execution_snapshots_attempts_check",
      sql`${t.attempts} BETWEEN 0 AND 3`,
    ),
    check(
      "analysis_execution_snapshots_hash_check",
      sql`${t.hash} IS NULL OR ${t.hash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "analysis_execution_snapshots_function_count_check",
      sql`${t.functionCount} >= 0`,
    ),
    check(
      "analysis_execution_snapshots_completion_check",
      sql`CASE WHEN ${t.status}='completed' THEN ${t.snapshot} IS NOT NULL AND ${t.hash} IS NOT NULL ELSE ${t.snapshot} IS NULL AND ${t.hash} IS NULL END`,
    ),
    index("analysis_execution_snapshots_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
    index("analysis_execution_snapshots_job_idx").on(
      t.jobId,
      t.createdAt.desc(),
    ),
    index("analysis_execution_snapshots_queue_idx").on(t.status, t.createdAt),
  ],
);

export const analysisQualitySnapshots = pgTable(
  "analysis_quality_snapshots",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    commitSha: text("commit_sha").notNull(),
    installationGeneration: integer("installation_generation").notNull(),
    externalScans: boolean("external_scans").notNull().default(false),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    leaseId: uuid("lease_id"),
    leaseAt: timestamp("lease_at", { withTimezone: true }),
    snapshot: jsonb("snapshot"),
    hash: text("hash"),
    findingCount: integer("finding_count").notNull().default(0),
    failureCode: text("failure_code"),
    createdAt: created(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "analysis_quality_snapshots_commit_sha_check",
      sql`${t.commitSha} ~ '^[a-f0-9]{40}$'`,
    ),
    check(
      "analysis_quality_snapshots_status_check",
      sql`${t.status} IN ('queued','running','completed','failed')`,
    ),
    check(
      "analysis_quality_snapshots_attempts_check",
      sql`${t.attempts} BETWEEN 0 AND 3`,
    ),
    check(
      "analysis_quality_snapshots_hash_check",
      sql`${t.hash} IS NULL OR ${t.hash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "analysis_quality_snapshots_finding_count_check",
      sql`${t.findingCount} >= 0`,
    ),
    check(
      "analysis_quality_snapshots_completion_check",
      sql`CASE WHEN ${t.status}='completed' THEN ${t.snapshot} IS NOT NULL AND ${t.hash} IS NOT NULL ELSE ${t.snapshot} IS NULL AND ${t.hash} IS NULL END`,
    ),
    index("analysis_quality_snapshots_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
    index("analysis_quality_snapshots_job_idx").on(t.jobId, t.createdAt.desc()),
    index("analysis_quality_snapshots_queue_idx").on(t.status, t.createdAt),
  ],
);

export const qualityFindingReviews = pgTable(
  "quality_finding_reviews",
  {
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => analysisQualitySnapshots.id, { onDelete: "cascade" }),
    findingId: text("finding_id").notNull(),
    state: text("state").notNull(),
    severity: text("severity"),
    reason: text("reason").notNull(),
    revision: integer("revision").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.snapshotId, t.findingId] }),
    check(
      "quality_finding_reviews_state_check",
      sql`${t.state} IN ('open','confirmed','false-positive','resolved')`,
    ),
    check(
      "quality_finding_reviews_severity_check",
      sql`${t.severity} IN ('critical','high','medium','low','info','unknown')`,
    ),
    check(
      "quality_finding_reviews_reason_check",
      sql`${t.reason} IN ('needs-review','verified','not-applicable','accepted-risk','remediated')`,
    ),
    check("quality_finding_reviews_revision_check", sql`${t.revision} > 0`),
  ],
);
export const qualityFindingEvents = pgTable(
  "quality_finding_events",
  {
    id: uuid("id").primaryKey(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => analysisQualitySnapshots.id, { onDelete: "cascade" }),
    findingId: text("finding_id").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    beforeValue: jsonb("before_value"),
    afterValue: jsonb("after_value").notNull(),
    createdAt: created(),
  },
  (t) => [
    index("quality_finding_events_snapshot_idx").on(
      t.snapshotId,
      t.createdAt.desc(),
    ),
  ],
);

export const savedDiagramLayouts = pgTable(
  "saved_diagram_layouts",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    diagramType: text("diagram_type").notNull(),
    name: text("name").notNull(),
    layoutConfig: jsonb("layout_config").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "saved_diagram_layouts_diagram_type_check",
      sql`${t.diagramType} IN ('system','frontend','backend','api','erd','dependencies','execution','infrastructure')`,
    ),
    index("saved_diagram_layouts_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
    index("saved_diagram_layouts_job_idx").on(t.jobId, t.diagramType),
  ],
);

export const analysisGeneratedDocuments = pgTable(
  "analysis_generated_documents",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    templateId: text("template_id").notNull(),
    title: text("title").notNull(),
    version: integer("version").notNull().default(1),
    contentMarkdown: text("content_markdown").notNull(),
    metadata: jsonb("metadata").notNull(),
    createdAt: created(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "analysis_generated_documents_template_id_check",
      sql`${t.templateId} IN ('overview','architecture','frontend','backend','api','schema','dependencies','execution','infrastructure','security')`,
    ),
    check("analysis_generated_documents_version_check", sql`${t.version} > 0`),
    index("analysis_generated_docs_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
    index("analysis_generated_docs_job_idx").on(t.jobId, t.templateId),
  ],
);

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    exportType: text("export_type").notNull(),
    format: text("format").notNull(),
    targetId: text("target_id").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    leaseId: uuid("lease_id"),
    leaseAt: timestamp("lease_at", { withTimezone: true }),
    artifactBinding: jsonb("artifact_binding"),
    artifactSize: integer("artifact_size"),
    artifactHash: text("artifact_hash"),
    errorMessage: text("error_message"),
    createdAt: created(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "export_jobs_export_type_check",
      sql`${t.exportType} IN ('diagram','document','bundle')`,
    ),
    check(
      "export_jobs_format_check",
      sql`${t.format} IN ('svg','png','pdf','markdown','mermaid','dbml','json')`,
    ),
    check(
      "export_jobs_status_check",
      sql`${t.status} IN ('queued','running','completed','failed')`,
    ),
    check("export_jobs_attempts_check", sql`${t.attempts} BETWEEN 0 AND 3`),
    check(
      "export_jobs_artifact_size_check",
      sql`${t.artifactSize} IS NULL OR ${t.artifactSize} >= 0`,
    ),
    check(
      "export_jobs_artifact_hash_check",
      sql`${t.artifactHash} IS NULL OR ${t.artifactHash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "export_jobs_completion_check",
      sql`CASE WHEN ${t.status}='completed' THEN ${t.artifactSize} IS NOT NULL AND ${t.artifactHash} IS NOT NULL ELSE true END`,
    ),
    index("export_jobs_workspace_idx").on(t.organizationId, t.createdAt.desc()),
    index("export_jobs_queue_idx").on(t.status, t.createdAt),
    index("export_jobs_job_idx").on(t.jobId, t.createdAt.desc()),
  ],
);

export const exportArtifacts = pgTable(
  "export_artifacts",
  {
    id: uuid("id").primaryKey(),
    exportJobId: uuid("export_job_id")
      .notNull()
      .references(() => exportJobs.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    contentType: text("content_type").notNull(),
    filename: text("filename").notNull(),
    payload: text("payload").notNull(),
    size: integer("size").notNull(),
    hash: text("hash").notNull(),
    createdAt: created(),
  },
  (t) => [
    check("export_artifacts_size_check", sql`${t.size} >= 0`),
    check("export_artifacts_hash_check", sql`${t.hash} ~ '^[a-f0-9]{64}$'`),
    index("export_artifacts_job_idx").on(t.exportJobId),
    index("export_artifacts_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
  ],
);

export const analysisVersionSnapshots = pgTable(
  "analysis_version_snapshots",
  {
    id: uuid("id").primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    commitSha: text("commit_sha").notNull(),
    installationGeneration: integer("installation_generation").notNull(),
    verifyFull: boolean("verify_full").notNull().default(false),
    baseSnapshotId: uuid("base_snapshot_id").references(
      (): AnyPgColumn => analysisVersionSnapshots.id,
    ),
    triggerKey: text("trigger_key").unique(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    leaseId: uuid("lease_id"),
    leaseAt: timestamp("lease_at", { withTimezone: true }),
    snapshot: jsonb("snapshot"),
    hash: text("hash"),
    fileCount: integer("file_count").notNull().default(0),
    failureCode: text("failure_code"),
    createdAt: created(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    check(
      "analysis_version_snapshots_commit_sha_check",
      sql`${t.commitSha} ~ '^[a-f0-9]{40}$'`,
    ),
    check(
      "analysis_version_snapshots_status_check",
      sql`${t.status} IN ('queued','running','completed','failed')`,
    ),
    check(
      "analysis_version_snapshots_attempts_check",
      sql`${t.attempts} BETWEEN 0 AND 3`,
    ),
    check(
      "analysis_version_snapshots_hash_check",
      sql`${t.hash} IS NULL OR ${t.hash} ~ '^[a-f0-9]{64}$'`,
    ),
    check(
      "analysis_version_snapshots_file_count_check",
      sql`${t.fileCount} >= 0`,
    ),
    check(
      "analysis_version_snapshots_completion_check",
      sql`CASE WHEN ${t.status}='completed' THEN ${t.snapshot} IS NOT NULL AND ${t.hash} IS NOT NULL ELSE ${t.snapshot} IS NULL AND ${t.hash} IS NULL END`,
    ),
    index("analysis_version_snapshots_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
    index("analysis_version_snapshots_job_idx").on(t.jobId, t.createdAt.desc()),
    index("analysis_version_snapshots_queue_idx").on(t.status, t.createdAt),
  ],
);

export const repositoryAnalysisPolicies = pgTable(
  "repository_analysis_policies",
  {
    repositoryId: uuid("repository_id")
      .primaryKey()
      .references(() => repositories.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    manifestId: uuid("manifest_id")
      .notNull()
      .references(() => analysisManifests.id),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    ref: text("ref").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
export const architectureComparisons = pgTable(
  "architecture_comparisons",
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
    fromId: uuid("from_id")
      .notNull()
      .references(() => analysisVersionSnapshots.id),
    toId: uuid("to_id")
      .notNull()
      .references(() => analysisVersionSnapshots.id),
    result: jsonb("result").notNull(),
    hash: text("hash").notNull(),
    createdAt: created(),
  },
  (table) => [
    unique("architecture_comparisons_from_id_to_id_key").on(
      table.fromId,
      table.toId,
    ),
    check(
      "architecture_comparisons_hash_check",
      sql`${table.hash} ~ '^[a-f0-9]{64}$'`,
    ),
    index("architecture_comparisons_workspace_idx").on(
      table.organizationId,
      table.createdAt.desc(),
    ),
  ],
);

export const workspaceControls = pgTable(
  "workspace_controls",
  {
    organizationId: uuid("organization_id")
      .primaryKey()
      .references(() => organizations.id),
    revision: integer("revision").notNull().default(1),
    retentionDays: integer("retention_days").notNull().default(90),
    retentionEnabled: boolean("retention_enabled").notNull().default(false),
    allowMemberSharing: boolean("allow_member_sharing")
      .notNull()
      .default(false),
    allowMemberExports: boolean("allow_member_exports").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check("workspace_controls_revision_check", sql`${t.revision}>0`),
    check(
      "workspace_controls_retention_days_check",
      sql`${t.retentionDays} BETWEEN 7 AND 3650`,
    ),
  ],
);
export const resourceShares = pgTable(
  "resource_shares",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => analysisJobs.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id),
    resourceKind: text("resource_kind").notNull(),
    resourceId: uuid("resource_id").notNull(),
    installationGeneration: integer("installation_generation").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    projection: jsonb("projection").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    check(
      "resource_shares_resource_kind_check",
      sql`${t.resourceKind} IN ('version','diagram')`,
    ),
    check(
      "resource_shares_token_hash_check",
      sql`${t.tokenHash} ~ '^[a-f0-9]{64}$'`,
    ),
    index("resource_shares_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
  ],
);
export const exportDownloadGrants = pgTable(
  "export_download_grants",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    exportId: uuid("export_id")
      .notNull()
      .references(() => exportJobs.id, { onDelete: "cascade" }),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    artifactHash: text("artifact_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: created(),
  },
  (t) => [
    check(
      "export_download_grants_artifact_hash_check",
      sql`${t.artifactHash} ~ '^[a-f0-9]{64}$'`,
    ),
    index("export_download_grants_workspace_idx").on(
      t.organizationId,
      t.createdAt.desc(),
    ),
  ],
);
export const workspaceUsageDaily = pgTable(
  "workspace_usage_daily",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    day: date("day")
      .notNull()
      .default(sql`CURRENT_DATE`),
    metric: text("metric").notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.organizationId, t.day, t.metric] }),
    check("workspace_usage_daily_count_check", sql`${t.count}>=0`),
    check(
      "workspace_usage_daily_metric_check",
      sql`${t.metric} IN ('share-created','share-opened','download-issued','download-used','retention-deleted')`,
    ),
  ],
);
