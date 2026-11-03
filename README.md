# codaryn

Every connection, in view. codaryn is a planned, evidence-backed architecture workspace for source repositories. It uses deterministic static analysis and no LLM.

This repository is an initial scaffold, not a working analysis platform. The existing Next.js starter is the only runnable application; authentication, ingestion, analyzers, storage, queues and exports are not implemented.

## Start here

- [Documentation index](docs/README.md)
- [Product specification](docs/product-specification.md)
- [Development phases and acceptance criteria](docs/phases.md)
- [Architecture and boundaries](docs/architecture.md)
- [Development and validation](docs/development.md)
- [Security and privacy](docs/security.md)

The current web application uses its existing npm lockfile. From the repository root, run `npm run dev` after `npm ci --prefix apps/web`. See the development guide for checks and limitations.
