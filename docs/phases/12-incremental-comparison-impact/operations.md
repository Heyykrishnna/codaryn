# Phase 12 operations

## Setup and deployment

Use the existing Node 22+/pnpm 10.19.0 toolchain. Install with `pnpm install --frozen-lockfile`, build with `pnpm build`, and apply additive migration 0015 with `pnpm db:sync`. The migration does not modify previous migrations or delete data. Both application and authentication schemas must verify before starting workers. Integration fixtures require explicit disposable `DATABASE_URL` and `DIRECT_DATABASE_URL`; never point them at Neon.

Start the comparison worker with the same backend environment as the existing artifact workers:

```sh
pnpm --filter @codaryn/comparison-worker dev
```

It requires `DATABASE_URL`, `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`, loaded through the existing ignored root environment loader. No new secrets or external scanner variables are required. API and web startup remain unchanged. Open `/comparisons`, select an existing analysis job and optionally a completed Before snapshot for cache reuse. Request a version, then select two completed snapshots to compare. Full verification is an explicit checkbox because it performs additional work.

`infrastructure/docker/comparison.Dockerfile` produces a non-root Node 22 worker. Compose's `workers` profile adds a read-only root, bounded temporary storage, 768-MiB memory, one CPU, 64 PIDs, dropped capabilities and no-new-privileges. The worker never invokes repository executables or needs Docker socket access. Network access is required for PostgreSQL and the existing GitHub archive/commit APIs; restrict deployment egress accordingly.

## Automatic pushes

Automatic analysis is disabled until a workspace owner/admin selects an existing analysis job as a configuration template and enables an exact branch policy, such as `refs/heads/main`. A repository currently supports one policy. Disabling it prevents new automatic scheduling and blocks outstanding automatic work at its next access/publication check. Manual version requests remain independently authorized workspace operations.

Configure the GitHub App's existing webhook endpoint/secret and subscribe it to push events during deployment. The application does not change App permissions/subscriptions itself. GitHub login alone is insufficient; the repository must remain active under the configured installation. Signed payload installation and repository IDs are bound to that workspace's connected repository and policy.

Deliveries and logical repository/ref/SHA triggers are deduplicated in PostgreSQL transactions. At 100 active repository version requests, scheduling returns 503 and rolls back the delivery receipt. After restoring capacity, use GitHub's delivery redelivery controls or an operator's authenticated delivery mechanism. Do not assume automatic redelivery by GitHub. No source or complete webhook payload is retained in the receipt table.

## Recovery, compatibility and retention

The worker polls every three seconds and uses leased claims with at most three attempts. Installation-generation changes, revoked membership, disabled policy, cancelled jobs and deleted workspaces deny publication. Stale lease IDs cannot overwrite another worker's result. A five-minute expired lease is recovered by the shared artifact worker; oversized input/output stops with a safe limit code. Generic extraction failures retry within the configured attempt bound. Requests can be inspected through version history and their safe failure code.

Use a new version request after fixing access or input issues; historical completed JSON and hashes are immutable. Baselines are explicit rather than a mutable global cache. Configuration/analyzer changes invalidate local reuse. Full-verification mismatch records `fallback-full` and publishes the independently recomputed full projection. Investigate mismatches before enabling broad automatic rollout; do not edit stored evidence to make hashes agree.

Snapshots referenced as baselines or comparison endpoints are protected by foreign keys. Retention must remove dependent comparisons/baseline references through a reviewed administrative retention workflow; this phase adds no public delete or history-edit endpoint. Policies retain their template manifest and actor references. Keep migration/operator credentials separate from runtime credentials.

## Validation and limits

Use the commands and acceptance mapping in [verification](verification.md). All fixtures run in disposable local services and are removed afterwards. Engine fixtures also run in a read-only, network-disabled Node 22 image. Real external delivery configuration and populated visual review are distinct deployment checks; deterministic signature/archive fixtures do not claim a live GitHub delivery occurred. See [supported analysis](supported-analysis.md) for the exact version projection and its static interpretation.
