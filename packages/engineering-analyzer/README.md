# Engineering analyzer

Pure static extraction for Phase 10 infrastructure, test relationships, imported coverage, dependency provenance and security signals. `extractQuality(files)` accepts bounded repository-relative source strings and returns a validated canonical snapshot with a SHA-256 hash. It does not read the filesystem, execute repository code or install dependencies. Optional scanner adapters import allowlisted evidence and fixed descriptions instead of raw source matches.

Use `pnpm --filter @codaryn/engineering-analyzer test` for deterministic positive, negative, malformed-input, redaction, coverage and scanner fixtures. See [supported analysis](../../docs/phases/10-infrastructure-testing-security/supported-analysis.md) and [security boundaries](../../docs/phases/10-infrastructure-testing-security/architecture.md).
