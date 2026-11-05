# Phase 8 verification

## Reproducible validation

Use Node 22 and pnpm 10.19.0. Set both database URLs to an isolated PostgreSQL 17 database and `REDIS_URL` to isolated Redis 7. Never run integration fixtures against the runtime Neon database.

The release validation sequence is:

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
```

Legacy tracked distribution files were removed from version control without deleting local runtime outputs. A source rebuild repairs stale shared exports; generated artifacts remain ignored.

The sequence passed in a clean Linux Node 22 workspace with disposable PostgreSQL and Redis. Reapplying migrations preserved all 41 registered application/migration tables; authentication schema verification also passed. The packaged schema worker passed a non-root, read-only, network-disabled extraction smoke test. Runtime Neon synchronization and verification also passed; no test fixtures were inserted there.

An additional, ad hoc SonarJS/TypeScript rule sweep reported 37 pre-existing findings in earlier-phase modules and no findings in the Phase 8 source. This supplemental sweep is not the repository lint configuration or the hosted quality gate. Required lint passes; the earlier-phase findings remain outside this change.

## Acceptance evidence

| Scenario         | Automated evidence                                                                                                        | Result                                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P08-AT01         | `packages/schema-engine/src/{extraction,sql,prisma,drizzle}.test.ts`                                                      | Supported SQL, migration, Prisma and Drizzle declarations produce typed, evidenced schema objects without executing project code.                                      |
| P08-AT02         | Engine join/composite-key/inference fixtures; self-referential SQL fixture; escaped SVG export assertions                 | Relations retain cardinalities and uncertainty. Canvas and export use distinct inferred styling and self-loop paths.                                                   |
| P08-AT03         | Engine source-lineage fixture; table/column API integration assertions                                                    | ORM declarations carry direct evidence; repository/DTO associations remain inferred. Unavailable intermediate steps are explicitly unresolved.                         |
| P08-AT04         | Engine deterministic hashes, structural comparison and escaped export fixtures; API export/compare integration assertions | JSON, SVG and Markdown identify the same snapshot/hash; supported structural additions and modifications are detected.                                                 |
| P08-AT05         | `apps/api/src/schema/schema.integration.test.ts`                                                                          | Session/CSRF enforcement, workspace isolation, bounded object routes, invalid inputs, search, exports and deleted-workspace denial pass.                               |
| Worker lifecycle | `workers/schema/src/process.integration.test.ts`                                                                          | Concurrent claims, immutable commit mismatch, access revocation before/during download and exhausted lease recovery pass against real PostgreSQL and archive fixtures. |

The browser check at `/schema` verified the signed-out authentication gate. A signed-in browser session was unavailable, so visual interaction with populated diagrams, responsive layouts and downloads was not verified in that session. API and engine coverage does not replace that remaining manual release review.

## Limits and release review

Read [supported syntax](supported-syntax.md) before interpreting results. SQL replay uses lexical path order rather than a framework-specific migration history. Dynamic ORM code and advanced SQL clauses are diagnostic, rather than evaluated. Inferred lineage does not establish a complete frontend-to-database runtime path. Large diagrams are deliberately bounded; object APIs and JSON preserve the bounded full snapshot.

The first hosted SonarCloud analysis identified implicit sort comparators and maintainability findings. Explicit locale-aware string ordering and parser/worker/API cleanup address the source findings. The original database migration remains immutable after application; its repeated lifecycle literals remain a minor maintainability finding rather than risking checksum drift. Hosted CI and SonarCloud must be checked for the pushed revision before merge. Local builds cannot establish the hosted quality gate result. Release owners should review parser limits, artifact retention and deployment egress controls alongside automated evidence. No required check should be bypassed or findings accepted merely to obtain a passing gate.
