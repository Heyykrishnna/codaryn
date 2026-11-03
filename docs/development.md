# Development

## Current setup

Node.js and npm are required. The web application has its own `package-lock.json`; install its dependencies with:

```sh
npm ci --prefix apps/web
npm run dev
```

The web starter listens on the port reported by Next.js. Root scripts delegate to the web package. No database, Redis, API or worker setup is available yet. `docker-compose.yml` is an empty service definition and is not a development environment.

## Checks

```sh
npm run lint
npm run typecheck
npm run build
```

These check only the existing web app. There is no test runner, CI pipeline, package build, integration test, migration or security scanner configured yet. Build may require network access for the starter's remote fonts. Add meaningful tests and CI as behavior is implemented; do not mistake this scaffold for completion of Phase 0.

## Delivery sequence

Use [phases.md](phases.md) and its acceptance criteria as the implementation backlog. First settle the tooling decisions, then establish validated contracts, API, persistence, queues and isolated workers. Add fixtures with expected evidence and graph outputs alongside each analyzer. Run tenant isolation, malicious archive, resource limit, error and reproducibility tests before processing real private repositories. Record the actual supported versions and limitations for each adapter.
