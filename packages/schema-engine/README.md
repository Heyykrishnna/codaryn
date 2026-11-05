# Schema engine

`extractSchema(files, inferRelations?)` statically extracts SQL DDL/migrations, Prisma and Drizzle into a canonical evidence-bearing snapshot and SHA-256 hash. The implementation never imports repository modules or runs SQL, generators or callbacks. `compareSchemas`, `renderSchemaSvg` and `renderSchemaMarkdown` consume the same snapshot contract.

Source adapters, relation normalization, lineage, comparison and export rendering remain separate files behind this small interface. Unsupported syntax is diagnostic; resource/input limits are enforced independently of the UI. Tests exercise source fixtures through the extraction interface.

See [Phase 8 architecture](../../docs/phases/08-schema-studio/architecture.md), [supported syntax](../../docs/phases/08-schema-studio/supported-syntax.md) and [verification](../../docs/phases/08-schema-studio/verification.md).
