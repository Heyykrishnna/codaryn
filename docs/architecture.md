# Architecture

## Status and decisions

This is a planned modular monorepo. Only the existing Next.js web starter and illustrative TypeScript contracts are present; none of the proposed product services or infrastructure are operational. The blueprint recommends Vite and pnpm/Turborepo, while the repository already contains a Next.js app with an npm lockfile. The scaffold preserves that app and lockfile rather than silently migrating it. Choose and document the frontend and workspace tooling before Phase 0 implementation; the reserved pnpm and Turbo configuration is not an active build pipeline.

## Target flow

GitHub installation and user request → API authorization and immutable analysis configuration → ingestion worker → isolated static analysis workers → canonical graph and evidence → snapshot storage → explorer, diagrams and documents. Comparison and export workers consume authorized snapshots. Jobs need idempotency, cancellation, retries, limits and observable progress.

Every snapshot belongs to a workspace, repository and immutable commit SHA, and records configuration and analyzer versions. Confirmed graph edges require source evidence; inferred, partial and unresolved relationships must remain distinguishable. The same snapshot feeds all projections. No analyzer should execute repository code or install its dependencies.

## Repository boundaries

- `apps/web`: existing Next.js presentation application; feature areas are reserved under `src/features`.
- `apps/api`: future control plane, authorization and versioned API.
- `workers`: independently scalable ingestion, analysis, webhook, comparison and export processes.
- `packages/contracts`: initial evidence and analyzer type shapes; not yet a published or validated API contract.
- `packages`: reserved analysis pipeline, graph, adapters, data and output modules. Analyzer directories group adapters by domain, not microservices.
- `fixtures/repositories`: future controlled fixture repositories and expected results.
- `infrastructure`: reserved deployment configuration; no services are configured yet.

Keep dependency direction from applications and workers toward shared contracts and focused libraries. Do not place UI concerns in analyzers, persistence in graph models, or tenant authorization solely in the client. Establish concrete package interfaces and ownership as each phase is implemented.

## Open decisions

Select frontend routing/build strategy, workspace package manager and lockfile migration, validated shared schemas, authentication provider, deployment topology, graph identity/versioning, storage retention, queue semantics and isolation mechanism before depending on them. The specification's stack is a target recommendation, not evidence of installed components.
