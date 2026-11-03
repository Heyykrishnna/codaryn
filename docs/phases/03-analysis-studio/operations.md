# Phase 3 operations and security

Run `pnpm install --frozen-lockfile`, `pnpm build` and `pnpm db:sync`. The existing ignored root `.env` provides pooled Neon `DATABASE_URL` and direct `DIRECT_DATABASE_URL`; no additional credentials are introduced. Run the API and web app, then visit `/studio`. Repository selection requires a connected, synchronized GitHub installation from Phase 2.

The migration is additive and transactional. Test it against an isolated database first. Back up the database before deployment and retain the previous application version for recovery. The previous application can operate with these extra tables; application rollback should leave the additive tables intact. Do not remove profile/manifest data to roll back application code. `pnpm db:verify` detects missing schema objects and migration checksum changes.

The configured Neon schema was synchronized after the migration passed local verification. Reapplying application migrations was successful. No fixture records were inserted into Neon. Integration tests use disposable PostgreSQL and Redis and explicitly set both database URLs to avoid accidentally selecting the production direct URL.

Security boundaries:

- Server sessions and exact-origin/custom-header checks protect mutations.
- Workspace membership is checked independently of the UI and held during database operations.
- Only owners/admins write or delete profiles. Members can prepare manifests for repositories in their workspace.
- Concurrent updates require the current revision; failed/stale writes roll back their audit and version writes.
- Selected commits are verified through GitHub and installation generation is rechecked under database locks.
- Strict allowlists and bounded globs prevent arbitrary module selection and unsafe path input. Globs are data in this phase, never passed to a shell.
- Audit records include operation identifiers, not source code, secrets or configuration payloads.
- No repository code runs and no dependency installation, document rendering or diagram generation happens in Phase 3.

Monitor unexpected API errors, profile conflict rates, upstream GitHub failures and manifest rate-limit responses. Establish a retention policy for manifests and profile versions before broad production use; records persist until removed through an authorized administrative process. Workspace soft deletion denies access without silently erasing analysis history.

Later execution phases must enforce resource categories, framework applicability and source exclusions inside their sandbox. Preserve existing dependency versions in persisted manifests and introduce explicit registry/manifest migrations when semantics change. Never silently reinterpret an older hash using a newer analyzer implementation.
