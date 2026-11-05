# Deployment, security and recovery

Use Node 22 and pnpm 10.19.0. Install frozen dependencies, build and synchronize the database before starting API/worker processes:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm db:sync
pnpm --filter @codaryn/execution-worker dev
docker compose --profile workers up -d --build execution
```

The worker uses the existing ignored backend environment: `DATABASE_URL`, `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`. Migrations use `DIRECT_DATABASE_URL`. Never put values in documentation, source, images or logs. No connection to an analyzed project's database is needed.

The image runs as a non-root user. Compose configures read-only root storage, bounded tmpfs, 768 MiB memory, one CPU, 64 PIDs, dropped capabilities and no-new-privileges. Restrict deployment egress to the database and approved GitHub API/archive endpoints. Do not mount the Docker socket or host source directories.

The shared artifact worker atomically claims one request with `SKIP LOCKED`, increments attempts and assigns a fresh lease. Expired five-minute leases retry up to three attempts; exhausted requests fail explicitly. Stale workers cannot publish over a newer lease. Access is checked before download and again under transaction locks before publication: current actor membership, workspace state, repository activity, installation generation, cancellation and pinned commit must still match.

Archive validation and cleanup use Phase 2 traversal/link/special-file/decompression safeguards. Source reads settle in batches of eight before temporary files are cleaned. Project code and configuration are never executed. Snapshot metadata and source-derived labels remain private repository artifacts; apply normal database encryption, backup, retention and export-access policies.

Monitor queue age, expired leases, failure codes, payload/resource limits, worker memory and GitHub rate limits. Keep a worker running for requests to advance. Resolve configuration/access problems and resubmit failed requests rather than editing completed snapshots. Migration 0012 is additive; rollback application code without dropping artifacts or altering applied migration checksums. Run all integration fixtures against disposable databases, never runtime Neon.
