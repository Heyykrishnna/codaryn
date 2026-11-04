# CI validation and failure remediation

The authoritative workflow is `.github/workflows/ci.yml`. It uses Node 22, pnpm 10.19.0, PostgreSQL 17 and Redis 7. GitHub Actions references are pinned to immutable commits. The workflow performs these steps in order:

```sh
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm db:sync
pnpm test:integration
```

Integration tests require a disposable database and Redis. Explicitly set both `DATABASE_URL` and `DIRECT_DATABASE_URL` to that database. Never run these tests against Neon or a database with user records. CI does not require a local `.env`, OAuth credentials or GitHub App credentials.

## November 4, 2026 corrections

The failing baseline was commit `0a849c1b17408a0f536dca541c13b9f2629d9378`, [CI run 41787127918](https://github.com/Heyykrishnna/codaryn/actions/runs/41787127918). The lint step failed with two `react-hooks/set-state-in-effect` errors in the Backend Explorer. Later steps were skipped by GitHub, so that run provided no build or integration result.

The Backend Explorer now derives loading and route-detail visibility from workspace/job/route request keys. It updates response state in request callbacks, ignores cancelled responses and hides previous results during selection changes. It does not defer synchronous effects with timers or disable the lint rule.

A clean Linux run also exposed database verification failures hidden behind lint. The verifier now recognizes text arrays and checks numeric precision and scale. Five frontend Drizzle declarations now match the SQL text-array columns. The unresolved-reference check name matches the existing migration. Additive migration `0010_frontend_indexes.sql` creates the two frontend indexes already declared by the schema. Applied migration files are unchanged, and the next `pnpm db:sync` applies the new indexes.

The independent SonarCloud gate reported Reliability C and 3.5% duplicated new lines. The request lifecycle card now uses its native details button for pointer and keyboard activation, and the frontend fixture handles rejected requests. Shared workspace request transport, HTTP method styles and state-record creation replace duplicated logic without changing quality thresholds, exclusions or accepted-issue statuses.

## Regression coverage

- Web transport tests run through `pnpm test` and verify query encoding, absent filters, no-store requests, mutation headers, workspace binding, malformed errors and network failures.
- Database type tests distinguish arrays from scalar/JSON columns and reject changed numeric precision/scale and unsupported types.
- Frontend analyzer tests preserve extraction of local/context/Redux/query state and API calls after state-record deduplication.
- The complete workflow is reproduced in a Linux Node 22 container with PostgreSQL and Redis, credentials excluded and a frozen lockfile. The initial failure and final result are recorded in the task's validation output.

Passing local checks does not change existing GitHub or SonarCloud statuses. Those services must analyze a commit containing the fixes. Re-running an older failing revision cannot test new source changes.

## Validation result

The full eight-step workflow above passed in Linux with Node 22.23.4, using a frozen installation, no local `.env` and disposable PostgreSQL/Redis. The production build, all configured unit tests, 40 application-table verification, authentication schema verification and the complete integration suite passed. The API integration group ran 17 tests with zero failures. Remote GitHub/SonarCloud status remains pending analysis of a commit containing these source changes.
