# Database configuration and synchronization

The backend uses Neon PostgreSQL through the existing `pg` driver. The API, analysis worker and ingestion worker share the database package's pool configuration. No provider-specific query API or second production database is introduced.

## Connections and secrets

Set `DATABASE_URL` to the Neon pooled connection URL for application traffic and `DIRECT_DATABASE_URL` to its direct connection URL for migrations and schema inspection. Store actual URLs in the ignored root `.env` for local development or in the deployment secret manager. The checked-in example contains no credentials. The API, workers and database commands load that local configuration when present; explicitly exported environment values take precedence. When overriding the database for a test or another environment, export both database URLs together.

Remote connections enforce certificate verification, enable channel binding and use at most five connections per process, a 15-second connection timeout and a 30-second idle timeout. Idle connection errors are logged without connection strings. Local PostgreSQL remains available for disposable tests through the Compose `local` profile. Do not disable TLS verification for Neon.

## Schema ownership

Application DDL is authoritative in `packages/database/migrations`. Applied migration filenames and SHA-256 checksums are recorded in PostgreSQL. Migrations execute in order inside a transaction with an advisory lock. An altered applied migration fails validation; changes require a new migration. The Drizzle definitions in `packages/database/src/schema.ts`, together with `foundationJobs`, mirror the application's columns, keys, indexes and checks.

Authentication tables belong to Better Auth. Runtime authentication and its migration command share the same persistence configuration, including database-generated UUIDs and database-backed throttling. This avoids creating an authentication schema incompatible with the server. No GitHub client secret or application auth secret is needed just to migrate these tables.

Run these commands after installing and building the workspace dependencies:

```sh
pnpm db:sync
pnpm db:verify
```

`db:sync` applies application migrations, applies Better Auth migrations and verifies both schemas. `db:verify` checks application columns, types, nullability, primary/foreign keys, expected checks, unique constraints, indexes and migration checksums. It also checks Better Auth's pending migrations and authentication UUID types/defaults. Running synchronization twice must leave the schema unchanged. Back up production data and review schema changes before future migrations; this workflow does not copy records from another database.

The supplied Neon target was empty before synchronization. Application migrations and authentication migrations were applied successfully, then synchronization was repeated successfully. The runtime pooled connection was checked over TLS and saw 21 public tables: 16 application/migration tables and five authentication tables. No user records or repository source were seeded into Neon for verification. Integration tests use a separate disposable local PostgreSQL database and Redis.

## Tests, CI and deployment

CI explicitly supplies local runtime and direct database URLs, starts disposable services, synchronizes/verifies the schema, and runs the integration suite. Neon credentials are not used in CI tests. Compose defaults to Redis; local PostgreSQL is opt-in:

```sh
docker compose --profile local up -d postgres redis
```

The ingestion container receives the canonical `DATABASE_URL`, so it can use Neon rather than depending on a local PostgreSQL container. Deploy the same database connection configuration to each backend service and keep the direct migration connection restricted to operators. Configure authentication and GitHub secrets independently as described in their setup guides.

The connection credential provided in chat should be rotated, then the ignored local configuration and deployment secret store should be updated. Credential rotation was not performed automatically. Existing data in another database was not deleted or copied.

Neon documents compatibility with conventional PostgreSQL clients and the distinction between pooled and direct connections in its [connection guide](https://neon.com/docs/connect/connect-from-any-app) and [pooling guide](https://neon.com/docs/connect/connection-pooling).
