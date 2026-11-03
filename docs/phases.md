# Development phases

Status: all phases are planned. This scaffold does not satisfy Phase 0 acceptance criteria. The full source specification remains in [product-specification.md](product-specification.md).

## Phase 0: Product foundation and system contracts

**Objective:** Establish the complete engineering foundation before feature implementation.

### Frontend

- Define design tokens.
- Create application shell.
- Create responsive navigation.
- Define typography and spacing system.
- Create shared UI components.
- Create graph node and edge design language.
- Define loading, error and empty states.
- Create reusable analysis configuration components.

### Backend

- Initialize Fastify application.
- Configure PostgreSQL.
- Configure Drizzle.
- Configure Redis.
- Configure BullMQ.
- Define authentication contracts.
- Define API response conventions.
- Establish environment configuration.
- Define shared Zod schemas.

### Analysis engine

- Create analyzer interfaces.
- Define graph node and edge contracts.
- Define evidence model.
- Define diagnostic model.
- Define analyzer versioning.
- Define graph identity strategy.

### Infrastructure

- pnpm workspace.
- Turborepo.
- Docker development environment.
- CI pipeline.
- Linting and type checking.
- Test infrastructure.

**Acceptance criteria**

- All applications build.
- Shared contracts compile.
- Database migrations run.
- Redis queues work.
- Workers can process a sample task.
- Frontend and API can communicate through validated contracts.

---

## Phase 1: Authentication and workspace management

**Objective:** Build the actual user and organization system.

### Frontend

- Sign-in page.
- GitHub sign-in.
- Account profile.
- Workspace creation.
- Workspace switching.
- Member management.
- Role management.
- Workspace settings.

### Backend

- User management.
- Session management.
- Organization CRUD.
- Organization membership.
- Role-based authorization.
- Workspace-scoped database queries.
- Audit event generation.

### Security

- Secure session handling.
- CSRF protection where applicable.
- Token storage encryption.
- Login rate limiting.
- Workspace access verification.

**Acceptance criteria**

- Users can create workspaces.
- Users can join or leave authorized workspaces.
- Roles are enforced by the API.
- One organization cannot access another organization's repositories.
- Workspace changes are auditable.

---

## Phase 2: GitHub connection and repository management

**Objective:** Allow users to securely connect and manage repositories.

### Frontend

- GitHub connection screen.
- Installation status.
- Repository grid.
- Repository table.
- Search and filters.
- Public/private badges.
- Branch selector.
- Commit selector.
- Repository settings.
- Disconnect integration flow.

### Backend

- GitHub App integration.
- Installation token handling.
- Repository listing.
- Branch retrieval.
- Commit retrieval.
- Permission validation.
- Webhook endpoint.
- Repository synchronization.
- Rate-limit handling.

### Ingestion worker

- Retrieve selected commit.
- Validate repository archive.
- Extract source into temporary workspace.
- Apply ignore rules.
- Build file inventory.
- Calculate content hashes.
- Detect monorepo boundaries.

### Security requirements

- No permanent raw GitHub installation tokens.
- No arbitrary repository scripts.
- No dependency lifecycle execution.
- Isolated ingestion storage.
- Cleanup after processing.

**Acceptance criteria**

- User can connect GitHub.
- Private repositories work with authorized access.
- User can choose a branch and commit.
- Repository ingestion returns a verified commit SHA.
- Repository contents are not exposed across workspaces.

---

## Phase 3: Analysis Studio and user configuration

**Objective:** Give users control over what the platform analyzes.

This phase is important because it determines the entire analysis workflow.

### Frontend

Build a complete multi-step Analysis Studio.

Screens:

1. Select repository.
2. Select branch and commit.
3. Select analysis profile.
4. Choose frontend analyzers.
5. Choose backend analyzers.
6. Choose database and schema analyzers.
7. Choose infrastructure analyzers.
8. Choose analysis depth.
9. Configure exclusions.
10. Choose diagrams.
11. Choose documents.
12. Review and start.

Additional features:

- Multi-selection.
- Preset cards.
- Analyzer descriptions.
- Required dependency indicators.
- Recommended configuration.
- Save custom presets.
- Duplicate presets.
- Reset to defaults.
- Configuration preview.

### Backend

- Analysis profile CRUD.
- Configuration validation.
- Analyzer compatibility validation.
- Dependency resolution.
- Configuration versioning.
- Configuration hashing.
- Analysis manifest creation.

### Analysis engine

Build an analyzer registry.

Each analyzer declares:

- ID.
- Version.
- Supported file types.
- Framework requirements.
- Dependencies.
- Configuration schema.
- Estimated resource category.

### Acceptance criteria

- Users can select multiple analysis modules.
- Invalid selections produce clear messages.
- Required analyzers are automatically added or explained.
- Saved presets can be reused.
- The backend validates all configuration independently of the frontend.
- The same configuration produces the same analysis manifest.

---

## Phase 4: TypeScript analysis foundation

**Objective:** Build the core static analysis engine.

### Frontend

- Analysis progress dashboard.
- Repository file inventory.
- Project structure explorer.
- File type summary.
- Parse error panel.
- Analyzer coverage indicators.
- Analysis stage timeline.

### Backend

- Analysis orchestration.
- Job creation.
- Job progress APIs.
- Job cancellation.
- Retry policies.
- Stage result persistence.
- Analyzer execution logs.

### Analysis engine

- TypeScript Compiler API integration.
- Compiler host.
- tsconfig discovery.
- Project reference handling.
- AST parser.
- Source file classification.
- Symbol extraction.
- Function extraction.
- Class extraction.
- Interface and type extraction.
- Import and export extraction.
- Diagnostics.

### Acceptance criteria

- TypeScript files parse correctly.
- TSX is supported.
- JavaScript within the project is supported.
- Multiple tsconfig files are handled.
- Parser errors do not crash entire runs.
- Every extracted symbol has source locations.
- Unsupported constructs are reported.

**Milestone:** A functioning TypeScript repository analyzer.

---

## Phase 5: Symbol resolution and dependency graph

**Objective:** Understand how source files and symbols connect.

### Frontend

- Dependency graph.
- File dependency view.
- Module dependency view.
- Incoming and outgoing dependency panels.
- Circular dependency warnings.
- Unresolved dependency panel.
- Source evidence inspector.
- Search and filters.

### Backend

- Graph persistence.
- Graph aggregation APIs.
- Node search.
- Edge search.
- Neighborhood queries.
- Graph pagination.
- Graph snapshot retrieval.

### Analysis engine

- TypeScript TypeChecker.
- Module resolution.
- Symbol resolution.
- Import/export mapping.
- Re-export handling.
- Circular dependency detection.
- Strongly connected components.
- Dependency depth.
- Module coupling metrics.

### Acceptance criteria

- Resolved imports link to actual source files.
- Symbols have stable identities.
- Circular dependencies are identified.
- Unresolved references remain visible.
- Every confirmed edge contains source evidence.
- Large graph queries are paginated.

**Milestone:** The first complete interactive code graph.

---

## Phase 6: Frontend architecture intelligence

**Objective:** Reconstruct the supported frontend architecture.

### Frontend

Build the Frontend Explorer with:

- Application overview.
- Component hierarchy.
- Page structure.
- Routing view.
- State management view.
- Hooks view.
- Context provider view.
- API client view.
- Component detail inspector.
- Search and path highlighting.

### Backend

- Frontend graph APIs.
- Component search.
- Component details.
- Rendering relationship endpoints.
- Route and hook query services.
- Component dependency queries.

### Analysis engine

- React component detection.
- JSX relationship extraction.
- Hook reference extraction.
- Context provider and consumer detection.
- Router detection.
- Route-to-page mapping.
- State management patterns.
- API client identification.
- Lazy import detection.

### Acceptance criteria

- Recognized components are indexed.
- Detected component references are linked.
- Page and route structures are visible.
- Hook and context relationships are traceable.
- API clients link to known backend endpoints only when evidence supports the mapping.

**Milestone:** Frontend architecture exploration.

---

## Phase 7: Backend architecture and API intelligence

**Objective:** Reconstruct backend organization and request handling.

### Frontend

Build the Backend Explorer.

Pages:

- Backend overview.
- Application startup.
- Module explorer.
- Controller explorer.
- Service explorer.
- Repository explorer.
- Middleware explorer.
- Authentication and authorization view.
- API endpoint inventory.
- Request lifecycle visualization.

### Backend

- Backend architecture API.
- Endpoint inventory API.
- Middleware chain API.
- Request flow API.
- Service and repository queries.
- Handler detail endpoints.

### Analysis engine

- Express route adapter.
- NestJS adapter.
- Fastify adapter.
- Controller and handler detection.
- Service pattern detection.
- Repository pattern detection.
- Middleware detection.
- Route mounting resolution.
- Request validation detection.
- Authentication pattern detection.

### Acceptance criteria

- Recognized routes are extracted.
- HTTP methods and paths are represented.
- Route handlers resolve where possible.
- Middleware order is represented where statically identifiable.
- Controller-to-service relationships are visible.
- Unresolved dynamic routing is clearly marked.

**Milestone:** Complete initial frontend and backend views.

---

## Phase 8: Schema Studio and database intelligence

**Objective:** Build the first-class schema diagram experience.

This phase must be prioritized ahead of optional advanced analysis features.

### Frontend

Build Schema Studio.

Screens:

- Schema overview.
- ERD canvas.
- Table browser.
- Table inspector.
- Column inspector.
- Relation inspector.
- Schema source panel.
- Schema filters.
- Schema layouts.
- Schema export.
- Schema documentation.
- Schema comparison.

### Backend

- Schema extraction result persistence.
- Schema object APIs.
- Table and field APIs.
- Constraint APIs.
- Relationship APIs.
- Schema lineage APIs.
- Schema comparison endpoints.
- Export endpoints.
- Schema search and pagination.

### Analysis engine

Initial support:

- Prisma.
- Drizzle.
- SQL DDL.
- SQL migrations.

Extraction:

- Tables.
- Columns.
- Types.
- Nullability.
- Defaults.
- Primary keys.
- Foreign keys.
- Unique constraints.
- Indexes.
- Enums.
- Relations.

Later adapters:

- TypeORM.
- Sequelize.
- Mongoose.

### Schema visualization

- One-to-one relationships.
- One-to-many relationships.
- Many-to-many relationships.
- Join tables.
- Self-relations.
- Relationship labels.
- Table grouping.
- Domain boundaries.
- Compact layouts.
- Full ER layouts.

### Schema integration

Connect:

```text
Frontend Field
    |
API Request Property
    |
Backend DTO
    |
Controller
    |
Service
    |
Repository
    |
ORM Model
    |
Schema Table / Column
```

Every connection needs direct or inferred evidence status.

### Acceptance criteria

- Prisma models generate ERD diagrams.
- Drizzle schema declarations generate ERD diagrams.
- Supported SQL DDL generates schema models.
- Table and column source locations are visible.
- Foreign keys are correctly represented.
- Inferred relations are visually distinct.
- Schema diagrams can be exported.
- Schema documents reference the same schema snapshot.
- Schema comparison detects supported structural changes.

**Milestone:** A real, connected Schema Studio.

---

## Phase 9: Call graphs, execution and data flow

**Objective:** Make internal code execution easier to understand.

### Frontend

- Function call graph.
- Function inspector.
- Execution path viewer.
- Branch and decision visualization.
- Data flow explorer.
- Entry-point explorer.
- Path search.
- Unresolved call inspector.

### Backend

- Call graph query service.
- Path traversal API.
- Function neighborhood API.
- Data flow retrieval API.
- Execution graph aggregation.

### Analysis engine

- Direct call resolution.
- Method resolution.
- Constructor references.
- Callback references.
- Control flow graphs.
- Return relationships.
- Initial intraprocedural data flow.
- Framework-aware entry-point discovery.

### Acceptance criteria

- Resolved calls link to real symbols.
- Call paths can be displayed.
- Branches and loops are represented.
- Dynamic calls remain unresolved where necessary.
- The interface distinguishes potential paths from guaranteed runtime behavior.

**Milestone:** Detailed code execution exploration.

---

## Phase 10: Infrastructure, testing and security intelligence

**Objective:** Understand the operational architecture around the application.

### Frontend

- Infrastructure explorer.
- Docker architecture.
- CI/CD workflow viewer.
- Environment configuration view.
- Testing explorer.
- Test-to-module relationships.
- Security dashboard.
- Finding detail inspector.

### Backend

- Infrastructure analysis APIs.
- Testing result APIs.
- Security diagnostics APIs.
- OSV result storage.
- Finding filtering and grouping.
- Audit and severity management.

### Analysis engine

Infrastructure:

- Dockerfile.
- Docker Compose.
- GitHub Actions.

Testing:

- Vitest.
- Jest.
- Test-to-symbol relationships.
- Coverage report ingestion.

Security:

- Hardcoded credential rules.
- Dangerous function patterns.
- Configuration rules.
- Semgrep integration.
- OSV Scanner integration.

### Acceptance criteria

- Infrastructure resources are extracted from configuration.
- CI/CD workflows are represented.
- Tests link to supported source symbols.
- Security findings contain evidence.
- Unsupported security cases are disclosed.
- Dependency vulnerability results distinguish declared versions from resolved lockfile versions.

**Milestone:** Operational architecture and engineering quality views.

---

## Phase 11: Diagram and documentation system

**Objective:** Make every analysis output understandable, exportable and connected.

### Frontend

- Diagram workspace.
- Documentation workspace.
- Search across generated documents.
- Source links.
- Saved diagrams.
- Export interface.
- Markdown preview.
- Diagram legends.
- Layout controls.

### Backend

- Diagram generation jobs.
- Graph serialization.
- Layout configuration storage.
- Document template execution.
- Export processing.
- Artifact storage.
- Document versioning.

### Analysis engine

- System architecture renderer.
- Frontend architecture renderer.
- Backend architecture renderer.
- API architecture renderer.
- ERD renderer.
- Dependency graph renderer.
- Execution flow renderer.
- Infrastructure renderer.
- Documentation template registry.

### Acceptance criteria

- All outputs use the same analysis snapshot.
- Every confirmed architecture claim has supporting evidence.
- Diagrams can be exported.
- Documentation can be exported.
- Saved layouts remain available.
- Generated documents carry analyzer and commit metadata.

**Milestone:** Complete architecture and documentation workspace.

---

## Phase 12: Incremental analysis, comparison and impact

**Objective:** Keep architecture synchronized with GitHub changes.

### Frontend

- Commit comparison.
- Architecture diff view.
- Added and removed nodes.
- Changed relationships.
- Schema diff view.
- Change impact explorer.
- Analysis history.
- Snapshot selection.

### Backend

- GitHub webhook processing.
- Commit comparison service.
- Incremental job scheduling.
- Snapshot comparison API.
- Graph version management.
- Impact result persistence.

### Analysis engine

- Changed file detection.
- File hash comparison.
- Dependency invalidation.
- Affected symbol detection.
- Selective analyzer execution.
- Graph reconciliation.
- Architecture drift rules.

### Acceptance criteria

- New commits trigger configured analysis.
- Unchanged files reuse compatible cached results.
- Changed files are reprocessed.
- Affected modules are identified.
- Historical snapshots remain immutable.
- Incremental results can be checked against a full analysis.

**Milestone:** Version-aware architecture intelligence.

---

## Phase 13: Collaboration, administration and exports

**Objective:** Turn codaryn into a usable team platform.

### Frontend

- Organization dashboard.
- Member management.
- Role management.
- Saved diagram views.
- Shared architecture links.
- Export center.
- Activity timeline.
- Workspace configuration.

### Backend

- Fine-grained permissions.
- Shared resource access.
- Signed export links.
- Audit logs.
- Usage tracking.
- Organization-level analysis presets.
- Retention controls.

### Acceptance criteria

- Users can share permitted repository analysis.
- Roles are enforced at API level.
- Shared resources cannot expose unauthorized private code.
- Exports are scoped to their analysis snapshots.
- All relevant administrative activity is auditable.

---

## Phase 14: Performance, security and production launch

**Objective:** Make the product dependable.

### Frontend

- Graph rendering optimization.
- Search optimization.
- Responsive layouts.
- Accessibility testing.
- Error boundaries.
- Offline-friendly static documentation where appropriate.
- Performance monitoring.

### Backend

- Load testing.
- Queue stability testing.
- Database index optimization.
- API rate limiting.
- Backup and recovery.
- Observability.
- Error monitoring.
- Retention enforcement.

### Analysis engine

- Golden repository tests.
- Parser benchmarks.
- Symbol resolution benchmarks.
- Graph accuracy tests.
- Analyzer regression tests.
- Large repository tests.
- Memory profiling.

### Acceptance criteria

- No cross-workspace data access.
- No repository script execution in ordinary static analysis.
- Large graph navigation remains responsive through progressive loading.
- Analysis jobs recover from worker failures.
- Full analysis can recover from incremental-analysis inconsistencies.
- Backup restoration is tested.
- Security review is completed.

---

