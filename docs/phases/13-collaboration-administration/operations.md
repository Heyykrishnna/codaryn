# Phase 13 operations

## Upgrade

1. Back up the database using the established provider procedure.
2. Run `pnpm db:sync` with the intended database environment. Migration 0016 is additive; schema plus auth verification must pass. Repeating migration/verification must remain idempotent.
3. Deploy matching API, web and export-worker revisions. Keep `AUTH_SECRET` at least 32 characters and stable across API instances. Rotation invalidates outstanding signed grants. No additional secret is required.
4. Review workspace controls in `/team`. Defaults preserve member exports, disallow member sharing and disable retention. Existing organization membership remains the authority.
5. Start workers only with operator authorization. Building images and running offline fixtures do not start live queue consumers.

The export worker requires only `DATABASE_URL`; it uses frozen bytes and does not fetch repositories. Its Compose `workers` profile runs nonroot with read-only filesystem, temporary `/tmp`, no extra capabilities, no privilege escalation, 768 MiB memory, one CPU and 64 process limit. `infrastructure/docker/export.Dockerfile` deploys production dependencies on Node 22.

## Review and recovery

- Requests queue an immutable export; if no export worker is running, the status stays queued. Refresh the export inventory to observe progress. Do not claim publication until completed.
- Legacy queued jobs without artifact bindings fail with `EXPORT_BINDING_REQUIRED`; reschedule through the current API. Completed legacy exports are retained.
- Lease recovery is fenced. Inspect structured status/failure codes; never print artifact payloads or environment values to diagnose failures.
- Signed downloads are consumed after successful server authorization. A network/browser failure may require issuing a new grant. Grant expiry is five minutes; sharing is at most seven days.
- Sharing and grants are revocable through the API. Repository disconnect, removed memberships and workspace deletion prevent future access. Revocation cannot erase recipient copies.
- Team writes have a shared 60-per-minute workspace budget based on team audit events. Paginate inventories and avoid aggressive refresh loops.

## Retention procedure

Enable retention and set days using a fresh session, refresh the preview, review its IDs, confirm permanent deletion and apply. Each batch has at most 125 entries; repeat only after reviewing a new preview. Changed policy or eligibility returns conflict. Retention is not a scheduled purge, legal hold engine or full-workspace erasure. Keep backups and distinguish source archive retention from these derived snapshots. Do not apply retention to a live workspace merely to test installation.

## Verification environment

Use a disposable PostgreSQL 17/Redis 7 Compose project. Set both `DATABASE_URL` and `DIRECT_DATABASE_URL` explicitly to it; also set its `REDIS_URL`. Never run fixture suites against the configured Neon database. CI performs schema sync, integration tests and repeat migration verification before building worker images. The export image's fixture run uses no network or live credentials.
