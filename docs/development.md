# Development

This repository uses Node.js 22 or later and pnpm 10.19.0. Install with `pnpm install --frozen-lockfile`. Run `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm format:check` from the root.

Build shared packages first with `pnpm --filter @codaryn/contracts build` and `pnpm --filter @codaryn/database build`. The web application and API can then be started with `pnpm --filter @codaryn/web dev` and `pnpm --filter @codaryn/api dev`. The web application reads `API_URL`, defaulting to `http://127.0.0.1:4000`. The API accepts `HOST` and `PORT`, defaulting to `127.0.0.1` and `4000`. Its health response is validated against the shared contract.

For local services, set `POSTGRES_PASSWORD` to a local development password and run `docker compose up -d`. Set `DATABASE_URL` to the corresponding PostgreSQL connection URL and `REDIS_URL` to the local Redis URL. Run `pnpm db:migrate` before starting the worker with `pnpm --filter @codaryn/analysis-worker dev`. With both services running, `pnpm test:integration` verifies a queued job reaches PostgreSQL. Set `POSTGRES_PORT` and `REDIS_PORT` to avoid local port conflicts. Do not use the local Compose configuration as a production deployment.

Authentication and workspace management are implemented. The worker processes a foundation task; repository ingestion, analyzers, analysis job submission and the complete architecture shell remain future work. The configuration form validates settings without starting a job. These components must not be used for processing real repositories yet. See [Phase 0](phases/00-foundation/README.md) for outstanding acceptance requirements.

Workspace integration tests run as part of `pnpm test:integration` after `pnpm db:migrate`. The workspace service is exposed through session-protected API routes. See [authentication setup](authentication.md) before starting the API. Real GitHub OAuth credentials and a secure public origin are required for end-user login.
