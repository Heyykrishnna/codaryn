# Comparison worker

Polls leased `analysis_version_snapshots` requests, reads bounded pinned GitHub archives, validates explicit same-workspace/repository baseline checksums, applies Studio input filters and runs the version engine. Current installation/workspace/job permissions and automatic policy access are rechecked before publication. Completed historical snapshots are never edited.

Start with `pnpm --filter @codaryn/comparison-worker dev` after building dependencies and applying migrations. The root environment loader reads `DATABASE_URL`, `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`. Compose's `workers` profile includes a non-root, read-only, resource-bounded container. Repository source programs and package scripts are never executed.

Unit tests: `pnpm --filter @codaryn/comparison-worker test`. Integration tests: `pnpm --filter @codaryn/comparison-worker test:integration` with both database URLs set to a disposable migrated database. See [operations](../../docs/phases/12-incremental-comparison-impact/operations.md) for push subscription, opt-in policies, lease/capacity recovery, retention and deployment limits.
