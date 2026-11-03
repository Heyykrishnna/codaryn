# Phase 2 verification

The GitHub App client, authenticated repository API, connection/repository UI, signed webhook processing and ingestion worker are implemented. Live-provider verification remains pending because no GitHub App credentials or public webhook endpoint are configured in the local environment.

| Acceptance area | Evidence | Limits |
| --- | --- | --- |
| P02-AT01: Installation access | GitHub transport tests reject a different personal account; database/API tests enforce workspace membership and synchronization removes revoked repositories | Real personal and organization App installations need staging verification |
| P02-AT02: Commit selection | The repository service resolves a full SHA before enqueueing; integration tests move the simulated branch afterward and assert the stored SHA is unchanged; the processor checks the SHA again before publishing | GitHub export is trusted over authenticated HTTPS; archive hashing is not independent Git-object verification |
| P02-AT03: Hostile archives | Tar fixture tests reject traversal, links, duplicate paths, oversized entries, malformed data and decompression bombs; extraction cleanup is checked on success and callback failure | Explicit archive, ignore-rule and repository-count limits apply |
| P02-AT04: GitHub failures | Transport tests exercise installation-token refresh, rate limits and hostile redirects; raw HTTP webhook tests verify exact-byte signatures and replay deduplication; revoked worker jobs cannot publish inventory | Provider outages and lost Redis state require the operational procedures in the setup guide |

Validation executed successfully:

- `pnpm db:migrate` against an isolated PostgreSQL database.
- `pnpm test:integration` against isolated PostgreSQL/Redis, using controlled GitHub gateway fixtures. This includes existing Phase 1 and queue tests, repository isolation and worker inventory persistence.
- Frozen-lockfile install, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm format:check` in a Linux container.
- `docker build -t codaryn-ingestion:phase2-check -f infrastructure/docker/ingestion.Dockerfile .`.
- `pnpm audit --prod`: no known vulnerabilities after updating Drizzle to a patched release.
- `git diff --check`.

The signed-out repository page was inspected in a browser. Authenticated repository selection, real GitHub consent, personal/organization ownership, private-repository downloads, real webhook delivery and the production ingress/egress topology still require staging verification. The controlled gateway fixtures are test-only and are not production responses.

See [GitHub operations](../../github.md) for setup, permissions, resource bounds, retention and deployment requirements. No repository scripts, builds or dependency lifecycle scripts are executed by ingestion.
