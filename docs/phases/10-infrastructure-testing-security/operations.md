# Phase 10 operations

## Setup

Install with `pnpm install --frozen-lockfile`, build dependencies using `pnpm build`, and synchronize the configured database using `pnpm db:sync`. Migration 0013 is additive and checksum-tracked; reapplying migration/verification must succeed unchanged. Runtime services use `DATABASE_URL`; migration operators should supply the direct `DIRECT_DATABASE_URL`. No credentials belong in source control.

Start API, web and quality worker:

```sh
pnpm --filter @codaryn/api dev
pnpm --filter @codaryn/web dev
pnpm --filter @codaryn/quality-worker dev
```

Open `/quality`, select a workspace and analysis job, then request a snapshot. The worker needs the same GitHub App ID and private key as ingestion and access to the selected installation. Existing connected repository jobs are the source of truth; signing in alone does not grant repository access.

| Variable                                  | Consumer        | Default/purpose                                                                                                       |
| ----------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                            | API and worker  | Required configured PostgreSQL/Neon connection.                                                                       |
| `DIRECT_DATABASE_URL`                     | Migration tools | Direct PostgreSQL migration connection.                                                                               |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` | Worker          | Existing GitHub App identity; never forwarded to scanners.                                                            |
| `ALLOW_OSV_NETWORK`                       | API and worker  | `false`; both must be `true` to allow explicit administrator-authorized external scans.                               |
| `SEMGREP_BINARY`                          | Worker          | Optional absolute path to trusted executable; absent means unavailable.                                               |
| `OSV_SCANNER_BINARY`                      | Worker          | Optional absolute path to trusted executable; absent uses fixed API fallback only when external lookup is authorized. |

The quality worker Dockerfile produces a Node 22 non-root image. Compose's `workers` profile supplies a read-only root filesystem, 768-MiB memory, one CPU, 64 PIDs, dropped capabilities, no-new-privileges and temporary storage. Optional CLI tools are not installed in the default image; supply a reviewed extended image with compatible pinned binaries and their runtime dependencies. Do not mount the Docker socket or repository host directories. Restrict outbound access to required services. The Compose scanner paths refer to paths inside that image, not host executables.

## Interpretation and recovery

Inspect snapshot status and safe `failureCode`. An unavailable Semgrep or disabled OSV status does not fail local built-in extraction or imply a clean scan. A failed optional tool remains explicitly failed. Fix missing binary/configuration, GitHub permissions or deployment policy and request a new snapshot; snapshots are immutable. Do not edit stored evidence to suppress findings.

The worker polls every three seconds. Claims use row locks and lease identifiers; exhausted leases fail after three attempts, and access revocation blocks publication. Shutdown stops polling and waits for the current request before closing PostgreSQL. CLI invocations have a 45-second timeout each; a scan with multiple tools can exceed the Compose graceful shutdown period, in which case the lease recovery path handles forced termination. Private temporary directories are removed in `finally`; ephemeral container storage is discarded on removal.

Review conflicts return 409: refresh the finding and compare its latest revision before saving again. Review limits return 429. Failed transactions do not leave partial audit history. All current members may read findings; only owner/admin roles can change state, reason or severity. Deleting a snapshot through administrative retention cascades its review records; there is no public deletion endpoint in this phase.

## Validation

Point both database URLs and Redis to disposable local services before integration tests. Never run fixture tests against the configured Neon database. Run the commands and acceptance scenarios in [verification](verification.md). Live scanner services are optional and separate from deterministic adapter fixtures. External scanner availability and downstream advisory changes must be recorded explicitly during deployment.

When supported credential signals occur anywhere in the snapshot, external vulnerability lookup uses the sanitized metadata-only OSV API path, even when an OSV CLI is configured. Raw lockfiles from those snapshots are not passed to external scanner commands; redacted identifiers are omitted and scanner status/messages disclose packages that were not queried.
