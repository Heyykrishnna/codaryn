# Architecture

## Status and decisions

The modular pnpm/Turborepo monorepo implements authenticated workspace and GitHub access, immutable analysis configuration, bounded ingestion and TypeScript/frontend/backend/schema/execution/engineering-quality analyzers. Later comparison and export services remain planned. Each implemented phase documents its current contracts and analysis boundaries.

## Target flow

GitHub installation and user request → API authorization and immutable analysis configuration → ingestion worker → isolated static analysis workers → canonical graph and evidence → snapshot storage → explorer, diagrams and documents. Comparison and export workers consume authorized snapshots. Jobs need idempotency, cancellation, retries, limits and observable progress.

Every snapshot belongs to a workspace, repository and immutable commit SHA, and records configuration and analyzer versions. Confirmed graph edges require source evidence; inferred, partial and unresolved relationships must remain distinguishable. The same snapshot feeds all projections. No analyzer should execute repository code or install its dependencies.

## Repository boundaries

- `apps/web`: existing Next.js presentation application; feature areas are reserved under `src/features`.
- `apps/api`: authenticated control plane, workspace authorization and versioned APIs.
- `workers`: independently scalable ingestion, analysis, webhook, comparison and export processes.
- `packages/contracts`: shared Zod schemas and initial analyzer types; the health response uses a validated contract.
- `packages`: reserved analysis pipeline, graph, adapters, data and output modules. Analyzer directories group adapters by domain, not microservices.
- `fixtures/repositories`: future controlled fixture repositories and expected results.
- `infrastructure`: reserved deployment configuration; local PostgreSQL and Redis are defined in the root Compose file.

Keep dependency direction from applications and workers toward shared contracts and focused libraries. Do not place UI concerns in analyzers, persistence in graph models, or tenant authorization solely in the client. Establish concrete package interfaces and ownership as each phase is implemented.

## Open decisions

Select an authentication provider, deployment topology, graph identity/versioning, storage retention, queue semantics and isolation mechanism before depending on them. The specification's stack is a target recommendation, not evidence of installed components.

## Graph identity

The version 1 identity encodes repository ID, full commit SHA, node kind, repository-relative path, symbol name and one-based source location as individually percent-encoded fields. It is deterministic for identical input and scoped to an immutable snapshot. Source movement or a new commit changes the identity; cross-snapshot matching requires an explicit comparison strategy in a later phase. Consumers must treat the identity as opaque.

## Workspace identity boundary

The database package contains an internal workspace service. It takes an actor identifier that must come from a verified server-side session; callers must never accept that identifier from request input. Better Auth supplies verified sessions to the protected Fastify workspace routes; origin and custom-header checks protect mutations. Workspace creation and renaming atomically record audit events; membership-scoped queries enforce owner and admin permissions for renaming. GitHub identity, invitations, session lifecycle and membership administration are implemented. Live OAuth consent and tenant isolation for future repository resources require additional verification.

Migrations use an advisory transaction lock and record checksums. An existing installation from the initial foundation predates migration tracking: the first migration is reapplied with its existing `IF NOT EXISTS` behavior and recorded; review existing schema compatibility before applying this change to any non-disposable database. Never edit an applied migration; add a new migration.

## GitHub and ingestion boundary

GitHub App ownership is checked separately from application login. Installations are bound to a workspace; session authorization and upstream GitHub permissions gate repository operations. The API resolves immutable commits and persists queue requests, while the ingestion worker downloads and processes bounded archives in a private temporary directory. Installation generations fence queued and running work after revocation. Only inventory metadata survives processing. See [GitHub setup](github.md) for deployment limits and the webhook/synchronization model.

## Engineering Quality

[Phase 10 architecture](phases/10-infrastructure-testing-security/architecture.md) describes infrastructure/test/security snapshots, scanner isolation, explicit external OSV consent and administrator-only audited finding reviews. The quality worker shares bounded archive/lease processing with schema and execution workers.

## Incremental versions and comparison

[Phase 12](phases/12-incremental-comparison-impact/architecture.md) adds immutable module/schema versions, checksum-validated per-file reuse, globally reconciled dependencies, saved architecture/schema diffs and conservative impact. Signed pushes schedule only explicit administrator-enabled branch policies. Earlier domain snapshots remain independent and immutable.
