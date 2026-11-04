# Phase 7: Verification Evidence

## Summary of Verification Commands

All validations below were executed and confirmed passing prior to release.

| Check | Command | Result |
|---|---|---|
| Contracts Unit Tests | `pnpm --filter @codaryn/contracts test` | 27/27 passed |
| Backend Analyzer Unit Tests | `pnpm --filter @codaryn/backend-analyzer test` | 31/31 passed |
| Database Package Tests | `pnpm --filter @codaryn/database test` | 2/2 passed |
| Analysis Worker Tests | `pnpm --filter @codaryn/analysis-worker test` | 6/6 passed |
| API Unit Tests | `pnpm --filter @codaryn/api test` | 3/3 passed |
| API Integration Tests | `pnpm --filter @codaryn/api test:integration` | 17/17 passed |
| Web App Turbopack Build | `pnpm --filter @codaryn/web build` | 11/11 routes static/hybrid generated |
| Prettier Code Style Check | `pnpm prettier --check .` | Clean, 0 issues |
| Turbo Monorepo Build | `pnpm turbo build` | Succeeded |

## Verified Scenarios

- **P07-AT01 (Framework Routes):** Express routers, Fastify plugins, and NestJS controllers extracted with exact path mounting and method mapping.
- **P07-AT02 (Middleware Sequence):** Preserved static execution ordering and marked dynamic handlers appropriately.
- **P07-AT03 (Request Relationships):** Linked routes to controllers, services, and repositories based on static analysis.
- **P07-AT04 (Authorization Evidence):** Identified validation and auth patterns with precise file provenance.
