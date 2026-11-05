# Verification and release evidence

## Automated acceptance

| Scenario                 | Evidence                                                                                                                                                                                                              |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P09-AT01                 | `packages/execution-analyzer/src/execution.test.ts`: direct imports/aliases, static methods, explicit/implicit constructors and deferred callback references resolve to indexed source definitions.                   |
| P09-AT02                 | Engine control fixtures represent if/switch/loop transitions and terminal returns; unsupported expression/exception regions are diagnostic. Path queries carry potential-static semantics.                            |
| P09-AT03                 | Engine fixtures retain mutable, parameterized, union, dynamic computed and external calls as unresolved. Malformed source is quarantined.                                                                             |
| P09-AT04                 | Engine value-flow fixtures preserve lexical binding identity and intraprocedural edges; API integration rejects interprocedural scope.                                                                                |
| Access and query bounds  | `apps/api/src/execution/execution.integration.test.ts`: session/CSRF, tenant denial, invalid IDs/depth, inspectors, path metadata, concurrent request rate limiting and soft-deleted workspace denial.                |
| Archive worker lifecycle | `workers/execution/src/process.integration.test.ts`: real tar fixture, real PostgreSQL, concurrent claims, evidence/hash persistence, pre-download and mid-download revocation, commit mismatch and exhausted leases. |
| Existing behavior        | Full integration chain includes Schema Studio worker/API regressions after shared artifact processing and snapshot access were extracted.                                                                             |

## Required commands

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm db:sync
pnpm test:integration
pnpm db:migrate
pnpm db:verify
docker build -f infrastructure/docker/schema.Dockerfile -t codaryn-schema-worker:ci .
docker build -f infrastructure/docker/execution.Dockerfile -t codaryn-execution-worker:ci .
```

Both database URLs and Redis must point to disposable services for integration runs. The runtime environment must not receive test fixtures. A supplemental SonarJS/TypeScript sweep checks new Phase 9 source without changing repository lint rules or suppressing findings.

Local and hosted outcomes are recorded in the feature PR before merge. Hosted CI and SonarCloud must pass for the exact pushed revision. Browser verification must distinguish authentication/empty states from populated graph interactions and responsive checks; do not substitute fixture API tests for unperformed visual review. Static analysis remains subject to the [supported-analysis boundaries](supported-analysis.md).

## Local result

All required local formatting, lint, type, production-build and unit checks passed. The complete integration chain passed against isolated PostgreSQL/Redis, including Schema Studio regressions. Migration reapplication and verification passed with 42 registered tables and the authentication schema synchronized. Runtime Neon synchronization also passed without fixture insertion.

Both production worker images built. The deployed execution analyzer passed all ten fixture tests under Node 22 with the fixture file mounted read-only; its production package deliberately omits test files. Non-root, read-only, network-disabled execution and schema smoke tests passed. The supplemental Phase 9 source sweep reported zero errors.

The authenticated browser verified workspace switching, loading/empty states and a 390px viewport with no horizontal overflow. Both available workspaces had no eligible analysis jobs or snapshots, so populated graph/control/value interaction was not manually exercised against runtime data. Engine and API fixture coverage does not replace that remaining visual release review. The temporary viewport override was reset.
