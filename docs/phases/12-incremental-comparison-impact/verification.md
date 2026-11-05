# Phase 12 verification and release evidence

## Test inventory

- Version-engine fixtures: incremental/full add/change/delete equivalence; cache/config/analyzer invalidation; corrupted global cache fallback; root alias retargeting; new dependency targets; schema/symbol changes; old/new transitive impact and cycles; literal/default redaction; malformed syntax; distinct stable declaration identities; early per-file bounds.
- Comparison API integration: authenticated workspace isolation, CSRF, strict payloads/pages/refs, incomplete snapshots, baseline/repository binding, immutable hashes, saved comparison reuse/history, admin policy management, signed push deduplication and queue-capacity HTTP rollback.
- Comparison worker integration: real tar archive and PostgreSQL, concurrent claims, checksum-validated baseline reuse/full equivalence, policy disable during download, atomic automatic-job completion, installation revocation, commit mismatch and exhausted leases.
- Web transport regression: explicit baseline and full-verification option retain the existing mutation header and workspace binding.
- Existing repository/schema/execution/quality worker/API tests run unchanged except compatible additions. Non-push webhook response compatibility is preserved.

## Required validation

Run from the repository root with Node 22+ and pnpm 10.19.0:

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm audit --prod --audit-level=moderate
pnpm db:sync
pnpm test:integration
pnpm db:migrate
pnpm db:verify
```

Both database URLs and Redis must explicitly reference disposable services for fixture runs. Phase 12 used its own Compose project with PostgreSQL 17/Redis 7 at ports 55470/56420. Never use the configured Neon environment for fixtures. Phase documents are formatted explicitly because the repository formatter excludes the phase directory.

## Recorded local outcomes

Validation date: November 5, 2026. Host Node 24.11.1, CI/runtime image Node 22 and pnpm 10.19.0.

| Check                                            | Actual result                                                                                                                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen installation and formatting               | Passed. Phase documents formatted explicitly; documentation links validated.                                                                                               |
| Lint, type checking, production build            | Passed: 22 lint tasks, 51 type/build-dependency tasks and 30 production-build tasks. `/comparisons` is included.                                                           |
| Full unit chain                                  | Passed: 47 tasks, including eleven version-engine fixtures.                                                                                                                |
| Integration chain                                | Passed: 28 tests across all configured suites, including 21 API tests and the comparison-worker lifecycle.                                                                 |
| Migration synchronization/reapplication          | Passed: 52 application tables and authentication schema verified; applied migrations unchanged.                                                                            |
| Production dependency audit                      | Passed: no known vulnerabilities reported by `pnpm audit --prod --audit-level=moderate`.                                                                                   |
| Schema/execution/quality/comparison image builds | All four passed against the final production source.                                                                                                                       |
| Restricted Node 22 fixtures                      | Passed: 19 existing quality fixtures and eleven incremental/comparison fixtures, non-root, no network, read-only root, bounded temporary storage and dropped capabilities. |
| Runtime Neon synchronization                     | Passed: tested additive migration applied; 52 application tables and authentication schema verified without fixtures.                                                      |

Initial fixture runs exposed a response compatibility regression, a Drizzle unique-constraint naming mismatch, and test-only UUID type/cast mistakes. These were corrected and the full applicable checks rerun. Final review also added explicit manifest identity validation, safe binding/computed-name handling, stable duplicate declaration identities, long-path preservation and early extraction bounds. No existing test was weakened or quality rule disabled.

Both database URLs and Redis were explicitly directed to disposable services for every fixture run. Historical snapshot hashes were checked after comparison; automatic publication and job completion were verified in one transaction. No credentials or fixture source bodies were committed.

## Browser and deployment boundaries

The signed-in comparison page rendered the actual workspace selector, empty job/version/comparison guidance, snapshot controls, disabled missing-job actions, optional full verification and owner policy controls. At a 390-pixel viewport both viewport width and document scroll width were 390. The viewport override was reset and a desktop screenshot saved outside the repository. Tailwind and its official integration were verified at exactly 4.3.4. No Next.js-specific framework issue was observed.

The current workspace had no analysis jobs or versions. Populated diff/impact interaction was not visually exercised with live data; automated fixtures verify its contracts and behavior. No production fixture data was created to make the page appear populated. No live GitHub App push subscription or repository policy was enabled during verification. Signed push behavior uses controlled payloads and actual database/HTTP paths; operators must subscribe the deployed App to push events and opt in per repository.

Hosted CI must pass for the exact pushed revision. Its run links and final outcome are recorded in the feature PR. No SonarCloud result is claimed. These checks establish the supported static projection, not runtime equivalence, exact affected-symbol execution or production-scale performance qualification; see [supported analysis](supported-analysis.md).
