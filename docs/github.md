# GitHub connections and repository ingestion

The repository screen at `/repositories` uses the authenticated workspace from Phase 1. An owner or admin links a GitHub App installation after the API verifies the logged-in GitHub user's ownership: a personal installation must match the GitHub user ID, and an organization installation requires active organization-admin membership. Knowing an installation ID alone does not grant access. Each installation belongs to one codaryn workspace.

## Configuration

Create a GitHub App with repository **Contents: read-only** and **Metadata: read-only** permissions. Subscribe to installation, installation-repository and repository events. Set the setup URL to the public website's `/repositories` page and webhook URL to `/api/v1/github/webhook` on that same website. The Next.js proxy forwards this endpoint to Fastify. Configure a randomly generated webhook secret of at least 32 characters.

Set `GITHUB_APP_ID`, `GITHUB_APP_SLUG`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_WEBHOOK_SECRET` in the API environment. The private key accepts PEM newlines or literal `\n` escapes. Keep it in a secret manager in production. If the App is not configured, authenticated users see an explicit unavailable state; the login and workspace features still operate.

The OAuth login application from Phase 1 remains separate from the GitHub App. Login now requests `read:org` in addition to profile and email scopes so the API can verify organization administrators. Existing users may need to re-authorize GitHub. Provider tokens are decrypted only through the server-side auth API; public access-token and refresh-token routes are disabled. Installation tokens are short-lived and cached only in the App authentication library's process memory, never in PostgreSQL or browser storage.

Run `pnpm install --frozen-lockfile`, `pnpm build` and `pnpm db:migrate` before starting the API and ingestion worker. Start a local worker with `pnpm --filter @codaryn/ingestion-worker dev` after exporting `DATABASE_URL`, `REDIS_URL`, `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`. A worker is required for queued ingestions to advance.

For the containerized worker, set `WORKER_DATABASE_URL` using the Compose hostname `postgres` and port `5432`; the Redis URL uses `redis:6379`. Run `docker compose --profile workers up -d --build ingestion`. The worker image runs as a non-root user with a read-only filesystem, bounded temporary storage, 512 MiB memory, one CPU, a PID limit and dropped capabilities. It has no host filesystem or Docker socket mount. Deployments should additionally restrict egress to GitHub's API and codeload endpoints and apply their own secret, monitoring and data-retention policies.

## User flow

1. Sign in, create or select a workspace, and open Repositories.
2. Install the configured App on an authorized GitHub account. Select the repositories GitHub should grant it access to.
3. Enter the returned installation ID on the repository screen and connect it. The API independently verifies GitHub ownership and workspace management permission.
4. Sync the installation to refresh repository metadata. The screen provides grid/table views, public/private filters, search within the current page and repository pagination.
5. Open a repository, choose a branch, load commits or enter a full 40-character SHA. Branch and commit lists support loading additional pages.
6. Start ingestion. The API resolves the chosen ref to an immutable full SHA before writing the queue request. Refresh status to inspect completion or a safe failure code.
7. Disconnect to revoke local workspace access. This does not uninstall the App from GitHub; the installation configuration link lets its owner manage that separately.

Only workspace members can list or ingest connected repositories. Management operations require owner/admin permission. Raw repository content is never returned to the browser. Installation deletion or suspension, repository removal, local disconnect and workspace membership changes block subsequent authorized operations and invalidate queued work as applicable. GitHub metadata is synchronized on demand; webhook delivery and sync are required to keep locally stored listing metadata current.

## Processing and limits

The database contains durable queued run records. The ingestion process enqueues pending records into BullMQ with the run ID as job ID, processes one job at a time and retries failures up to three times with exponential delay. Run metadata contains the commit SHA and installation generation. The processor checks workspace membership, repository access and connection generation before downloading and again before publishing inventory. GitHub commit access is checked after extraction. A completed run is skipped on duplicate execution.

The archive URL is pinned to the resolved SHA. Only GitHub's HTTPS codeload host is accepted for downloads, and installation credentials are not forwarded to it. This trusts GitHub's authenticated export of the requested commit; an archive SHA-256 is provenance for the downloaded bytes, not an independent proof of Git's commit object.

Archives are limited to 25 MiB compressed, 64 MiB decompressed tar data, 50 MiB file data, 2 MiB per file and 10,000 entries. Paths are bounded in length and depth. Traversal, absolute or backslash paths, duplicate files, links and special files are rejected. File modes do not preserve executable bits. Extraction occurs in a private temporary directory and is removed on success or failure. Repository scripts, dependency installation and lifecycle hooks never run.

Default exclusions cover `.git`, dependencies, vendor directories and build/coverage directories. Root and nested `.gitignore` files are applied, bounded to 100 files, 256 KiB total and 2,000 lines. A 90-second extraction deadline is checked during file processing. Package manifests identify candidate package roots; multiple roots or a pnpm workspace file indicate a monorepo. No project configuration code is imported or evaluated. Binary files are hashed as bytes. The database retains hashes, file paths, sizes and package-root metadata, not raw source or archives. The browser receives a bounded summary of the ten most recent runs.

This initial implementation supports at most 5,000 repositories per installation, 50 repositories per listing page and 50 branches/commits per upstream page. Oversized installations fail explicitly. Empty repositories and inaccessible commits surface GitHub access errors. Rate limits surface a retry indication; a rejected installation token is refreshed once. Webhooks validate the exact raw payload's HMAC-SHA256 signature and deduplicate delivery IDs transactionally. Permission increases and unsuspension require explicit revalidation/reconnection rather than silently restoring access.

Redis must retain BullMQ state durably. A running job relies on BullMQ stalled-job recovery; queue loss requires operator reconciliation of in-flight database records. Source retention is ephemeral, while database inventory, run and webhook metadata require an operator-defined retention policy. Later analysis phases can consume the temporary workspace through the ingestion package's callback; this phase only inventories it.

## Verification

`pnpm test` includes mocked GitHub transport tests for installation ownership, pinned archive requests, safe redirects, rate limits and token refresh, plus real tar fixtures for extraction limits, links, traversal, duplicates, decompression limits and cleanup. `pnpm test:integration` uses real PostgreSQL/Redis and controlled GitHub gateway fixtures to check workspace isolation, synchronization, immutable selection, webhook revocation/replay and ingestion persistence. The production build and worker image are separate validation steps.

Live GitHub installation, consent, private-repository export and webhook delivery require real OAuth/App credentials and a public endpoint. Those external flows must be validated in staging before release. Automated fixtures do not constitute live provider verification. GitHub's authoritative references are [App installation endpoints](https://docs.github.com/en/rest/apps/installations) and [webhook signature validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries).
