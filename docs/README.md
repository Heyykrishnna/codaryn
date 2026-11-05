# Documentation

The [product specification](product-specification.md) preserves the supplied blueprint, including the complete feature inventory, models, APIs, design direction, release strategy and security requirements. It describes the target product, not implemented functionality.

- [Phases](phases/README.md): individual phase plans, dependencies and acceptance test scenarios.
- [Architecture](architecture.md): repository boundaries, data flow and decisions for the scaffold.
- [Development](development.md): setup, commands, testing and implementation sequence.
- [Security](security.md): trust boundaries and required controls.

When implementation changes a contract or behavior, update the relevant guide and record decisions here. Phase overviews reproduce the specification’s phase sections for navigation; update both when changing their substance.

- [Authentication and workspaces](authentication.md): OAuth setup, roles, migrations, security boundaries and validation limits.

- [GitHub connections and ingestion](github.md): App configuration, repository permissions, archive limits and worker operation.

- [Database configuration and synchronization](database.md): Neon connections, schema verification and isolated test setup.

- [SonarCloud remediation](quality-remediation.md): findings, fixes and cloud verification status.

- [Analysis Studio](phases/03-analysis-studio/README.md): configuration wizard, workspace profiles, analyzer registry and reproducible manifests.

- [CI validation and remediation](ci.md): authoritative checks, isolated testing and fixes for workflow and quality-gate failures.

- [Schema Studio](phases/08-schema-studio/README.md): static schema adapters, immutable snapshots, ERDs, evidence, exports and structural comparison.

[Execution Explorer](phases/09-execution-data-flow/README.md) documents call resolution, control/data-flow limits and secure worker operation.

[Engineering Quality](phases/10-infrastructure-testing-security/README.md) documents infrastructure, test relationships, coverage provenance, dependency security and audited review.

[Architecture Comparison](phases/12-incremental-comparison-impact/README.md) documents incremental version reuse, commit/schema diffs, potential impact and opt-in push scheduling.
