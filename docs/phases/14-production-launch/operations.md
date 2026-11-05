# Phase 14 operational runbook

## Upgrade and qualify

1. Complete a provider backup before the maintenance window. Run the disposable recovery drill; a local drill does not prove the provider's backups or restore-time objective.
2. Run the documented local/CI checks. Apply `pnpm db:sync` to the intended environment and repeat migration/verification. Migration 0017 adds request-budget state and nullable analysis leases. Migration 0018 removes the redundant candidate graph index after representative query plans selected the existing job/path index. Applied checksums are never rewritten.
3. Build and pin qualified API/web/worker images by digest. Review `infrastructure/docker/production.compose.yml`; it runs only API and web, with the API private and web bound to loopback for a TLS reverse proxy. Use the deployment secret manager, never checked-in values.
4. Configure HTTPS AUTH_BASE_URL and WEB_ORIGIN, stable AUTH_SECRET, GitHub OAuth/App settings and a distinct OPERATIONS_TOKEN of at least 32 characters. Optional values should be omitted or blank. Rotate operations credentials without exposing the authentication secret. Rotating AUTH_SECRET invalidates sessions and Phase 13 signed grants.
5. Configure a trusted TLS proxy that overwrites client forwarding headers and protects direct API access. TRUSTED_PROXY is optional and off by default. With it disabled, users behind one proxy share its request budget. Validate your proxy chain before enabling it; never use an indiscriminate trust-all setting.
6. Check liveness/readiness, HTTPS redirects, secure session cookies, narrow origins, private cache headers, webhook verification and private metric collection in staging. Use real user journeys and representative organizations before production approval.
7. Start live workers only with operator authorization. Root `pnpm dev` starts web/API only; `pnpm dev:workers` is a separate explicit queue-consumer command. The current task leaves them stopped. The analysis worker now consumes real queued analysis jobs, fetches private repository archives and writes analysis artifacts; it is no longer the foundation smoke process.

## Worker operation

Analysis accepts at most 1,000 candidate TypeScript/JavaScript/JSON files and 16 MiB selected source, within the existing 25 MiB compressed archive/parser bounds. It pins the GitHub commit, validates access again before atomic publication, and never runs package scripts/plugins. Per-job IDs prevent identical paths in separate jobs from colliding. The V8 heap cap is 384 MiB inside a 768 MiB container. A job exceeding limits fails explicitly; this is not unlimited monorepo qualification.

Claims recover after five minutes with bounded attempts. Publication is a transaction; interruption rolls it back. Existing jobs with abandoned legacy running state are eligible for recovery. Cancellation can wait for a bounded publication transaction; queued/download-stage cancellation is honored before publication. Inspect failure codes and queue age; never log repository source, environment values or full exceptions. Preserve failed jobs for review and avoid infinite manual retries.

The legacy foundation queue handler remains only as a regression fixture. It is not the production worker entry point. Analysis polling uses the shared graceful shutdown helper; SIGTERM stops new work and awaits current processing. Nonroot images use read-only roots, temporary scratch storage, CPU/memory/PID limits and no extra capabilities. Ordinary analyzers need GitHub egress to download a selected archive; optional scanner network behavior remains explicitly configured.

## Backup and recovery

`RECOVERY_CONTAINER=codaryn-phase14-postgres-1 pnpm --filter @codaryn/database test:recovery` is intentionally restricted to the disposable loopback PostgreSQL service on port 55495. It creates a unique new database, streams a custom-format dump to restore, verifies ordered migration checksums, auth tables and fixture row/hash integrity, then removes only its target and fixture data. It refuses the configured remote Neon database and never overwrites an existing target. The archive is held in memory, not written into source control.

For a real incident, use the provider-supported restore into a new database/branch, compare schema and integrity, run staging smoke tests, then plan a controlled endpoint switch. Keep source archives and external GitHub configuration in the recovery inventory. The operator must define and test RPO/RTO, backup retention, encryption, access and restoration permissions. Do not run the disposable drill command against production or assume the template supplies a production backup schedule.

## Monitoring and retention

Collect fixed-route request counters, 5xx counts, duration buckets, pool waiting counts, RSS, uptime and client LCP/INP/CLS/error totals through the private endpoint. Add deployment-specific alerts for sustained 5xx, readiness failure, queue age, repeated lease expiry, saturation, 429 increases and missing backups. Metrics are per instance and reset on restart; aggregate them externally. Do not label metrics with tenant IDs, raw paths or source.

Retention remains the Phase 13 opt-in reviewed preview/apply operation. No background purge is enabled. Assign an administrator a documented review cadence and preserve protected baselines/shares/grants. Source archive erasure, legal holds and provider backups have separate policies.

## Rollback

Stop newly deployed workers, preserve their failure metadata, deploy the prior compatible API/web images, and assess queued analysis leases. The added database columns/table are additive; do not drop them during incident response or edit applied migrations. Remove only the unused candidate index through migration 0018. Restore data into a new database if integrity is in doubt. Requalify the exact release revision before restarting consumers.

Browser security headers are generated with the qualified web image. Static/partial rendering requires the documented inline-script/style CSP compatibility exception; production eval remains disabled. Review that exception before launch and do not add third-party script origins without a separate assessment.
