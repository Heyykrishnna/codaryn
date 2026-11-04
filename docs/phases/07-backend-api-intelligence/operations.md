# Phase 7: Operational Guide

## Worker Pipeline Configuration

The backend intelligence extraction runs as the `backend` stage within the analysis worker pipeline.

- **Pipeline Position:** Executes after `frontend` and before `diagnostics`.
- **Cancellation Safety:** Checks job cancellation flags before starting and handles partial analysis failures without corrupting other jobs.
- **Resource Attribution:** Batches database insertions into transactional chunks with `ON CONFLICT DO NOTHING` to guarantee idempotency.
- **Memory Consumption:** Extracts AST nodes incrementally per file, releasing AST memory after source traversal.

## Database Maintenance

- **Schema Migration:** Applied via `0009_backend_intelligence.sql`.
- **Foreign Keys:** All backend intelligence tables reference `analysis_jobs(id)` with `ON DELETE CASCADE`. When an analysis job is deleted or purged, associated backend records are cleaned up automatically.
- **Indexes:** Dedicated composite indexes on `(job_id, path)`, `(job_id, method)`, and `(job_id, name)` enable sub-millisecond query latency.

## Security & Sandbox Invariants

- Repository code is analyzed exclusively as static AST text. No analyzed files are ever imported, evaluated (`eval`), or executed as active JavaScript.
- Analysis workers do not require network access to extract backend architecture.
