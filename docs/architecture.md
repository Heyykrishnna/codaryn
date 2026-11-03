# Architecture

## Status and decisions

This is a planned modular monorepo. The repository uses the existing Next.js application and has moved to a pnpm/Turborepo workspace. A Fastify health endpoint, shared contracts, a database migration and a foundation worker are present. Product services and secure repository analysis are not yet implemented.

## Target flow

GitHub installation and user request → API authorization and immutable analysis configuration → ingestion worker → isolated static analysis workers → canonical graph and evidence → snapshot storage → explorer, diagrams and documents. Comparison and export workers consume authorized snapshots. Jobs need idempotency, cancellation, retries, limits and observable progress.

Every snapshot belongs to a workspace, repository and immutable commit SHA, and records configuration and analyzer versions. Confirmed graph edges require source evidence; inferred, partial and unresolved relationships must remain distinguishable. The same snapshot feeds all projections. No analyzer should execute repository code or install its dependencies.

## Repository boundaries

- `apps/web`: existing Next.js presentation application; feature areas are reserved under `src/features`.
- `apps/api`: future control plane, authorization and versioned API.
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
