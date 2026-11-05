# Phase 10 verification and release evidence

## Acceptance coverage

The [acceptance matrix](acceptance-tests.md) maps every original requirement to deterministic fixtures and manual checks. Important implementation paths are:

- `packages/contracts/src/quality.test.ts`: scanner status and coverage invariants.
- `packages/engineering-analyzer/src/engineering.test.ts`: 13 extraction, provenance, redaction, malformed-input and sanitized scanner-adapter tests.
- `packages/execution-analyzer/src/execution.test.ts`: call-index regression, including nested source imports.
- `workers/quality/src/scanners.test.ts`: six tests for curated local rules, opt-in/policy, safe failure reporting and stripped subprocess environment.
- `workers/quality/src/process.integration.test.ts`: PostgreSQL/archive lifecycle, concurrent claims, access and role revocation, no external call after pre-extraction downgrade, commit mismatch and lease exhaustion.
- `apps/api/src/quality/quality.integration.test.ts`: authenticated workspace access, strict requests, filters, versioned reviews, atomic audit, immutable hash, rate limits and role downgrade.
- `apps/web/src/lib/workspace-request.test.mjs`: quality mutation headers, explicit external policy and review revision transport.

## Local checks

Validation date: November 5, 2026. Host Node 24.11.1 and pnpm 10.19.0; CI targets Node 22. A disposable PostgreSQL 17/Redis 7 Compose project uses ports 55450/56400. Both database URLs explicitly target that disposable database during integration runs. Fixture records are never inserted into Neon.

| Command                                    | Observed result                                                                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`           | Passed.                                                                                                                   |
| `pnpm format:check`                        | Passed. Phase documents also formatted explicitly because the repository formatter excludes the phase tree.               |
| `pnpm lint`                                | Passed, 18 tasks.                                                                                                         |
| `pnpm typecheck`                           | Passed, 41 tasks.                                                                                                         |
| `pnpm build`                               | Passed, 24 tasks including the `/quality` production route.                                                               |
| `pnpm test`                                | Passed, 37 tasks; quality analyzer 13 tests and scanner worker six tests.                                                 |
| `pnpm audit --prod --audit-level=moderate` | Passed; no known vulnerabilities reported.                                                                                |
| `pnpm db:sync`, `pnpm test:integration`    | Passed again after Docker restart; 26 integration tests across the complete chain.                                        |
| `pnpm db:migrate`, `pnpm db:verify`        | Passed idempotent reapplication; 45 application tables and authentication schema verified after Docker restart.           |
| Schema/execution worker image builds       | Passed again after Docker restart against the final production source.                                                    |
| Quality worker image build                 | Passed with the final privacy guard; all 19 analyzer/scanner fixtures also passed in the isolated non-root Node 22 image. |

The tested additive migration was applied to the configured Neon environment; a subsequent read-only verification confirmed 45 application tables and a synchronized authentication schema. No production fixture data or credential changes were introduced.

The initial validation filled the local disk. A commit attempt failed rather than bypassing Git checks. After space became available, installation and project checks passed again. Docker restarted successfully; integration, idempotency and all three image checks then passed. The first isolated-image fixture run exposed a temporary-script execution assumption. The fixture now invokes the installed Node executable through a temporary symlink; all 19 tests pass without relaxing container controls.

## Browser verification

The signed-in `/quality` route rendered the real workspace selector, empty job/history guidance, explicit external OSV disclosure and disabled extraction without a selected job. A 390-pixel viewport reported document width 390 and scroll width 390, with no horizontal overflow. Desktop screenshot was saved outside the repository as task evidence. Tailwind and its integration are exactly 4.3.4; components use utility classes with the configured Prettier plugin.

The workspace had no eligible jobs or quality snapshots. Populated inventory/finding/review UI interactions were not visually exercised with live data. Automated analyzer/API fixtures cover their contracts and behavior; they do not substitute for an unperformed populated visual review.

## External and release limits

SonarCloud verification is omitted at the user’s explicit request. No passing SonarCloud result is claimed. GitHub CI must run on the exact pushed head; its outcome belongs in the feature PR before merge.

Live Semgrep/OSV-Scanner binaries are not installed or exercised in this validation. Their local adapters and failure/consent behavior are fixture-tested; operators must install trusted compatible pinned tools and run a live deployment smoke test when enabling them. OSV HTTP behavior is tested with controlled responses, not private repository submissions. External lookups remain disabled by default.

Static analysis has the [documented supported syntax and limits](supported-analysis.md). No repository tests/builds/installers were executed, and imported coverage is not a fresh execution claim. Release-owner review and later production-launch hardening remain separate from implementation completion.
