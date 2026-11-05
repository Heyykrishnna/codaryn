# Development

Use Node.js 22 or later and pnpm 10.19.0. Install with `pnpm install --frozen-lockfile`. The required checks are `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm format:check`.

Configure the runtime Neon `DATABASE_URL` and direct migration `DIRECT_DATABASE_URL` in the ignored root `.env`, then run `pnpm build` and `pnpm db:sync`. See [database operations](database.md) for synchronization, schema ownership and test isolation. The API, workers and database commands load this local file when present. Explicit environment values take precedence. The web app uses its own environment for `API_URL`, defaulting to `http://127.0.0.1:4000`.

Start the API and web app with `pnpm --filter @codaryn/api dev` and `pnpm --filter @codaryn/web dev`. See [authentication setup](authentication.md) for the required OAuth and session configuration and [GitHub operations](github.md) for repository access and ingestion. Build shared dependencies before using package-specific development commands. Generated `dist` files are ignored and are not versioned; rebuild after switching branches or changing shared contracts so development servers use current exports.

Tests must use a disposable database. Set both database URLs to that test database, set `REDIS_URL`, then run `pnpm db:sync` and `pnpm test:integration`. Local services are available with `docker compose --profile local up -d --wait postgres redis`; set `POSTGRES_PASSWORD` and optional local ports. CI supplies isolated services and runs the same synchronization and test commands.

Schema Studio uses a dedicated worker: `pnpm --filter @codaryn/schema-worker dev`. It reads the same backend environment and processes schema requests for pinned analysis jobs. See [Schema Studio operations](phases/08-schema-studio/operations.md) for container deployment, security boundaries and recovery. See the individual phase guides for supported analysis features and acceptance evidence.
