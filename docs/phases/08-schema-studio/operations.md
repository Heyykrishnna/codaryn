# Schema worker operations and security

## Setup

Use the existing Node 22/pnpm workspace toolchain and PostgreSQL configuration. Run `pnpm install --frozen-lockfile`, `pnpm build` and `pnpm db:sync` before starting the API or schema worker. No connection to an analyzed project's live database is needed.

The dedicated worker uses the canonical backend `DATABASE_URL`, `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`. Local development loads the ignored root `.env` and restarts on edits. Production secrets belong in the deployment's secret manager. The worker needs no Redis connection; PostgreSQL is its durable request queue.

```sh
pnpm --filter @codaryn/schema-worker dev
docker compose --profile workers up -d --build schema
```

The image runs as the node user. Compose configures a read-only filesystem, bounded temporary workspace, one CPU, 768 MiB memory, a PID limit, dropped capabilities and no-new-privileges. Do not mount the Docker socket or host source directories. Restrict network egress to the configured database and GitHub API/codeload endpoints in deployment infrastructure.

## Request lifecycle

Requests progress from queued to running to completed/failed. Each claim uses a fresh lease UUID and atomically increments attempts. Concurrent workers use `SKIP LOCKED`, so only one owns a request at a time. Publication requires the same live lease. Expired five-minute leases are retried until three attempts; exhausted leases fail explicitly. The worker processes one archive at a time per process.

The worker checks current workspace membership, workspace deletion, repository activity, installation generation and analysis-job cancellation before downloading and again before publishing. It verifies the selected commit remains accessible. A disconnect/reconnect changes generation, so a queued request cannot silently regain old permission. Failure states contain a bounded safe code, not stack traces, tokens or source content.

Archive traversal, links, special files and decompression/resource limits use the Phase 2 validator. Supported source files are read in batches of eight; all reads settle before cleanup. Temporary archives/source trees are removed on success and failure. Parsing is static; SQL statements, Prisma generators, Drizzle callbacks, imports and project build scripts are never executed.

Source excerpts intentionally persist inside authorized schema snapshots for inspection. Treat the database and exports as private repository-derived artifacts. Apply backup, storage encryption and workspace retention/access policies. No source text or credentials are written to worker logs. Completed snapshots are immutable through these interfaces and cannot be overwritten by a stale worker.

## Deployment and recovery

Migration `0011_schema_studio.sql` is additive. Review and back up production state before deployment; do not edit applied migration checksums. Reverting application code can leave the new table intact. Never drop historical snapshots as a rollback shortcut. Run migration reapplication and `pnpm db:verify` against a disposable database before promotion.

Monitor queued/running age, expired leases, failed request codes, worker exits, payload limits and GitHub rate limits. Keep a worker running for queued requests to advance; the UI deliberately shows queued rather than simulated completion. A failed request can be submitted again after fixing access/configuration. Retention should be implemented by an authorized operational process with workspace policy, rather than silent deletion during normal extraction.

A snapshot hash authenticates the canonical extracted content, not GitHub's archive bytes independently of the trusted provider. Commit pinning and the archive gateway establish provenance. Static/inferred lineage is not proof of runtime field-level flow or schema migration safety.
