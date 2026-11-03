# Documentation

The [product specification](product-specification.md) preserves the supplied blueprint, including the complete feature inventory, models, APIs, design direction, release strategy and security requirements. It describes the target product, not implemented functionality.

- [Phases](phases/README.md): individual phase plans, dependencies and acceptance test scenarios.
- [Architecture](architecture.md): repository boundaries, data flow and decisions for the scaffold.
- [Development](development.md): setup, commands, testing and implementation sequence.
- [Security](security.md): trust boundaries and required controls.

When implementation changes a contract or behavior, update the relevant guide and record decisions here. Phase overviews reproduce the specification’s phase sections for navigation; update both when changing their substance.

- [Authentication and workspaces](authentication.md): OAuth setup, roles, migrations, security boundaries and validation limits.

- [GitHub connections and ingestion](github.md): App configuration, repository permissions, archive limits and worker operation.
