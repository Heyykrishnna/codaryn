# Phase 4: TypeScript analysis foundation

**Objective:** Build the core static analysis engine.

### Frontend

- Analysis progress dashboard (`apps/web/app/analysis/page.tsx`).
- Repository file inventory (`FileTypeSummary`, `FileExplorer`).
- Project structure explorer with tsconfig resolution.
- File type summary by language and role.
- Parse error and syntax diagnostics panel (`DiagnosticsPanel`).
- Analyzer coverage indicators (`AnalysisCoverageIndicators`).
- Analysis stage execution timeline (`AnalysisTimeline`).

### Backend

- Analysis orchestration (`AnalysisService`, `AnalysisWorker`).
- Job creation and queueing (`POST /api/v1/analysis/start`).
- Job progress and stage inspection APIs (`GET /api/v1/analysis/job`).
- Job cancellation (`POST /api/v1/analysis/cancel`).
- Bounded retry policies (`POST /api/v1/analysis/retry`).
- Stage result persistence across PostgreSQL normalized tables.
- Structured analyzer execution logs with log levels and stages.

### Analysis engine

- TypeScript Compiler API integration via `@codaryn/compiler`.
- Virtual in-memory Compiler Host avoiding disk I/O hazards.
- Hierarchical tsconfig discovery and parser.
- Project reference handling (`tsconfig.build.json`, composite projects).
- AST parser and node visitor across TypeScript, TSX, and JavaScript.
- Source file classification (`@codaryn/file-classifier`) for language, role, and framework detection.
- Symbol extraction (`@codaryn/ast` and `@codaryn/symbols`):
  - Function and method declarations with parameter types and signatures.
  - Class declarations with inheritance, implementations, methods, and properties.
  - Interface and type alias declarations with detailed property schemas.
  - Import and export declarations with specifier mappings and re-exports.
- Diagnostics and syntactic error collection (`AstDiagnostic`).

### Acceptance criteria

- [x] TypeScript files parse correctly (`.ts`).
- [x] TSX is supported (`.tsx`).
- [x] JavaScript within the project is supported (`.js`, `.jsx`).
- [x] Multiple tsconfig files and composite project references are handled.
- [x] Parser errors do not crash entire runs; partial failure resilience ensures clean files proceed.
- [x] Every extracted symbol has deterministic ULID identifiers and exact source locations.
- [x] Unsupported constructs and syntax errors are isolated into structured diagnostics.

**Milestone:** A functioning TypeScript repository analyzer.

## Planning and dependencies

**Status:** Implemented. All acceptance criteria and verification scenarios have been executed with passing results.

**Dependencies:** Phases 0–3 for workspace authorization, repository ingestion manifests, and analysis studio configuration.

## Key Implementation Artifacts

1. `@codaryn/contracts` (`packages/contracts/src/analysis.ts`):
   - Strict Zod schemas for source locations, file classifications, symbol types, stage progress, and API envelopes.
2. `@codaryn/file-classifier` (`packages/file-classifier/src/classifier.ts`):
   - Language resolution, semantic file roles, lines-of-code calculation, and framework heuristics.
3. `@codaryn/compiler` (`packages/compiler/src/`):
   - Virtual in-memory compiler host, tsconfig parser, and multi-project resolution.
4. `@codaryn/symbols` & `@codaryn/ast` (`packages/symbols/`, `packages/ast/`):
   - Deterministic symbol ULID generation and AST extractor.
5. `@codaryn/database` (`packages/database/migrations/0006_analysis_foundation.sql`):
   - Normalized relational schema for jobs, stages, files, symbols, diagnostics, and logs.
6. `workers/analysis` (`workers/analysis/src/processor.ts`):
   - Multi-stage execution pipeline with cancellation and retry management.
7. `apps/api` (`apps/api/src/analysis/`):
   - REST endpoints with workspace isolation and authorization checks.
8. `apps/web` (`apps/web/src/features/analysis/`, `apps/web/app/analysis/`):
   - Interactive analysis dashboard, stage timeline, coverage widgets, and symbol/diagnostic explorers.

[Full product specification](../../product-specification.md) · [All phases](../README.md) · [Acceptance test report](acceptance-tests.md) · [Architecture](architecture.md) · [API Reference](api.md) · [Operations Guide](operations.md)
