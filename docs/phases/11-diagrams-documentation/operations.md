# Phase 11 operations

## Setup and migrations

Synchronize and migrate the database using the standard migration CLI:

```sh
pnpm db:migrate
pnpm db:verify
```

Migration `0014_diagrams_documentation.sql` creates:
- `saved_diagram_layouts`
- `analysis_generated_documents`
- `export_jobs`
- `export_artifacts`

All operations are strictly additive; previous tables and schema integrity are preserved.

## Running services

Start the Web interface, API server, and Export Worker:

```sh
# Start Fastify REST API
pnpm --filter @codaryn/api dev

# Start Next.js Frontend
pnpm --filter @codaryn/web dev

# Start Export Queue Worker
pnpm --filter @codaryn/export-worker dev
```

## Worker execution and lease management

The Export Worker polls the `export_jobs` table using PostgreSQL's `FOR UPDATE SKIP LOCKED` mechanism:
- **Polling interval:** Default 3000ms.
- **Lease duration:** 5 minutes (`lease_at < now() - interval '5 minutes'`).
- **Max retries:** 3 attempts. Expired leases with 3 or more attempts transition to `failed` status with `LEASE_EXPIRED`.
- **Tenant authorization:** Before processing an export, the worker verifies that the requested actor belongs to the organization and the connected repository is active and not cancelled. If validation fails, the job immediately fails with `UNAUTHORIZED`.
- **Atomic publication:** The worker generates the artifact, calculates the SHA-256 hash and byte length, and inserts the record into `export_artifacts` within the same database transaction that updates the job status to `completed`.

## Rate limiting & resource governance

- **Export generation:** Limited to 10 export requests per organization per minute to prevent compute and storage exhaustion.
- **Request payload limit:** Fastify enforces an 8KB body limit on export creation and layout persistence requests.
- **Artifact download:** Artifacts are streamed with `Content-Type`, sanitized `Content-Disposition`, `ETag`, and `Content-Length` headers.
