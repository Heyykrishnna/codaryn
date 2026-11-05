# Execution intelligence architecture

Execution Explorer analyzes source declarations for an immutable analysis-job commit. It never records runtime execution or executes project code. Every view carries potential-static semantics.

## Extraction

`packages/execution-analyzer` uses a TypeScript compiler host backed exclusively by the supplied file map. Filesystem fallback, emitted output, dependency installation, tsconfig execution and project scripts are unavailable. Relative module imports use TypeScript resolution inside that virtual filesystem. Syntax-invalid files are quarantined and reported.

The analyzer indexes functions, methods, explicit/implicit constructors, callbacks and module scopes. Resolved calls identify indexed source declarations. Mutable, parameterized, union-valued, dynamic and external targets remain unresolved when a unique implementation is unsupported. Callback references record passing a function as a value; they do not prove invocation. Exported declarations and framework conventions provide potential entry points.

Control graphs represent supported statement transitions, branches, loops, switch fallthrough and terminal returns/throws. Local value graphs record scalar parameters, definitions, reads, assignments and returns. Evidence is a repository-relative path and line range. Stable source identities and canonical ordering produce deterministic snapshot hashes.

## Persistence and delivery

`workers/execution` supplies the extractor to `packages/artifact-worker`. Schema Studio uses the same shared archive, permission, lease and publication implementation. Each execution request captures a job, repository, commit, actor, workspace and installation generation. PostgreSQL is the durable queue; the execution worker does not require Redis.

Migration `0012_execution_intelligence.sql` adds `analysis_execution_snapshots` without changing applied migrations. Snapshots progress through queued/running/completed/failed states. A completed snapshot has both JSON and a hash; incomplete snapshots have neither. Payloads are bounded and completion is atomic. Failed requests retain safe codes, not source text or stack traces.

The API reads only workspace-authorized snapshots. It supplies paginated functions, calls, entries and unresolved targets, bounded inspectors, neighborhoods and path searches. The web client validates responses with shared contracts, cancels stale requests, and shows loading, empty, failed and permission-error states. The shared workspace shell keeps Schema Studio and Execution Explorer authentication behavior consistent.
