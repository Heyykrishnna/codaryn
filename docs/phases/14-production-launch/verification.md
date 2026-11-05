# Phase 14 verification record

Validation date: November 5, 2026. Host Node 24.11.1 on macOS arm64, pnpm 10.19.0. CI and packaged qualification use Node 22. Disposable PostgreSQL 17 and Redis 7 use `codaryn-phase14` on ports 55495/56445. Both database URLs are explicitly overridden for fixtures.

## Required commands

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
pnpm --filter @codaryn/analysis-worker bench
pnpm --filter @codaryn/database test:recovery
```

The database commands in the fixture sequence require disposable URLs. The restoration drill also requires RECOVERY_CONTAINER and refuses non-loopback/incorrect-port targets. Phase Markdown is formatted explicitly because the root formatter excludes phase directories. Docker builds do not imply live worker startup.

## Observed implementation measurements

- The 10,000-node real HTTP graph fixture passed 200 requests at concurrency 10. Observed local p95 was approximately 32 ms; response size was 84,988 bytes. This is a local regression workload, not a production SLA.
- The 1,000-module golden fixture produced the expected 999 edges. Host run: approximately 147 ms parser work, 4 ms resolver work, 893 ms combined qualification and 336,101,376 bytes RSS increase. The initial unconstrained V8 run exceeded the 512 MiB RSS-increase budget; a 384 MiB production heap cap resolved it without increasing the acceptance threshold.
- Isolated Node 22 Linux arm64 image with one CPU, no network and 768 MiB memory: parser approximately 1,036 ms, resolver 10 ms, total 6,256 ms, RSS increase 109,051,904 bytes. Full/incremental and corrupted-input semantic comparisons passed.
- Disposable custom-format PostgreSQL backup restored successfully into a fresh generated database. Migration checksums, auth tables and a fixture row/hash survived. The drill removes its own target; no live database was restored over.
- Real analysis processor/consumer test passed: pinned archive, separate job IDs, concurrent claim exclusion, killed-child lease recovery, revoked access rejection and absent repository script sentinel.
- Representative EXPLAIN after ANALYZE selected the existing job/path index. The redundant new candidate index is removed in a new migration; no comparative index speedup is claimed.

Final whole-tree checks, packaging, browser evidence and hosted run outcomes are recorded after observation. No SonarCloud, independent review, production deployment, provider restore-time objective or populated live workspace is inferred from these controlled results.

## Final qualification evidence

- Frozen installation, formatting, lint (22 tasks), TypeScript (51 tasks), production build (30 tasks), unit suite (47 tasks) and production dependency audit passed during qualification. The final compatibility and header changes were additionally rebuilt and checked; the final exact-revision results are linked in the PR.
- Full integration chain passed 32 tests across the API, database and workers. The added retry regression also repairs a deliberately poisoned derived node without duplicating artifacts. No existing test was disabled or weakened.
- Repeated migration and schema/auth verification passed. The configured Neon schema was synchronized without running test fixtures there: 57 application tables verified. The final disposable restore drill preserved all 19 migration checksums and verified 62 public tables including auth and migration metadata.
- The 10,000-node React render fixture generated only 200 selectable nodes and 199 visible connecting edges. Final HTML was 178,342 bytes, with observed local render time approximately 11 ms. Focusability, labels and selection state were present in the real component output.
- API, web and six Node 22 worker images built. The existing Node 24 ingestion image has an additional build gate. Isolated Node 22 fixtures passed: quality 19/19, comparison 11/11, export 2/2, plus the 1,000-module golden benchmark. A repeated constrained Linux run completed in approximately 7.8 seconds with 107,536,384 bytes RSS increase.
- API/web smoke containers ran nonroot with no network, read-only roots and fixture-only environment values. API liveness succeeded and readiness failed closed without a database. Web documentation/offline-guide routes and qualified browser headers succeeded. Smoke containers were removed afterward.
- Browser verified authenticated graph/empty-analysis states and the public guide. At 390 px, viewport and document scroll widths were both 390. The actual offline guide download succeeded and its file began with the expected public guide title. A desktop screenshot is retained outside the repository as `phase-14-graph.png`. The temporary viewport override was reset.
- The live workspace had no analysis jobs. No live analysis, repository permission change, retention action, provider recovery or worker startup was used to populate the screen. Populated flows use isolated fixtures. Formal assistive-technology audits and representative production end-to-end journeys remain staging/operator gates.
- A misplaced client directive was caught and fixed by the production build. A test cleanup table-name typo was caught and fixed by the real database test. TSX's local IPC socket required the normal expanded test sandbox permission; the same tests passed when rerun with it. These failures were investigated, not suppressed.
- No meaningful framework-specific friction remained after routine implementation fixes; no Next.js agent-feedback candidate was retained. Skills were used as guidance without modifying canonical or mirrored skill files.

Hosted CI must pass for the exact pushed commit. Push/PR run links and final conclusions are recorded in the PR without changing the revision being checked. No SonarCloud or independent security-review result is claimed. Release-owner acceptance of CSP compatibility, trusted ingress, provider backup objectives, external alerting and real production load is still required before public launch.
