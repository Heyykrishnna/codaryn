# Schema extraction worker

Processes authorized, leased schema requests from PostgreSQL. Reads pinned GitHub archives through the shared gateway and extraction sandbox, invokes the static schema engine and publishes only after rechecking access and commit provenance.

Run `pnpm --filter @codaryn/schema-worker dev` locally, or use the `schema` Compose service. See [operations and security](../../docs/phases/08-schema-studio/operations.md) for credentials, limits, leases, failure states and production isolation.
