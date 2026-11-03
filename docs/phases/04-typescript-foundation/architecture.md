# Phase 4: TypeScript Analysis Architecture

## 1. System Overview

The Phase 4 TypeScript Analysis Engine delivers static analysis for TypeScript, TSX, and JavaScript codebases. The architecture is engineered around six key design requirements:

1. **Security via Isolation**: No analyzed code, build scripts, or repository dependencies are ever executed. Compilation happens entirely in an in-memory virtual host.
2. **Partial Failure Containment**: Malformed files or syntax errors in one module do not fail or stall the analysis of other modules in the repository.
3. **Multi-Project Resolution**: Mono-repositories with multiple `tsconfig.json` files and project references are accurately mapped and navigated.
4. **Deterministic Symbol Provenance**: Every extracted symbol receives a reproducible ULID based on its repository, path, kind, parent scope, and name, accompanied by start/end line and column locations.
5. **Multi-Stage Orchestration**: Analyses execute through explicit observable stages (`inventory`, `configuration`, `parsing`, `symbols`, `diagnostics`, `completed`), persisting progress incrementally to PostgreSQL.
6. **Cancellation & Retry Policies**: Running jobs can be aborted safely via cooperative `AbortSignal` checks, and failed jobs can be retried within strict limits.

## 2. Component Architecture

```
                          ┌───────────────────────────┐
                          │   Next.js Web Dashboard   │
                          │   (Timeline, Explorers)   │
                          └─────────────┬─────────────┘
                                        │ HTTP / REST
                                        ▼
                          ┌───────────────────────────┐
                          │      Fastify API Host     │
                          │   (/api/v1/analysis/*)    │
                          └─────────────┬─────────────┘
                                        │ Database & Queue
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │                         Analysis Worker Pipeline                      │
    │                                                                       │
    │  ┌──────────────┐    ┌───────────────┐    ┌────────────────────────┐  │
    │  │ File         │───▶│ tsconfig &    │───▶│ Virtual Compiler Host  │  │
    │  │ Classifier   │    │ Config Parser │    │ (In-memory TS Host)    │  │
    │  └──────────────┘    └───────────────┘    └───────────┬────────────┘  │
    │                                                       │               │
    │                                                       ▼               │
    │  ┌──────────────┐    ┌───────────────┐    ┌────────────────────────┐  │
    │  │ Diagnostic   │◀───│ Symbol        │◀───│ AST Extractor          │  │
    │  │ Collector    │    │ Identifier    │    │ (Node Visitor)         │  │
    │  └──────────────┘    └───────────────┘    └────────────────────────┘  │
    └───────────────────────────────────┬───────────────────────────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │    PostgreSQL Database    │
                          │ (Jobs, Stages, Inventory) │
                          └───────────────────────────┘
```

## 3. Core Packages and Responsibilities

### `@codaryn/contracts` (`packages/contracts/src/analysis.ts`)
Defines the authoritative Zod schemas and TypeScript types for the entire static analysis lifecycle:
- `SourceLocation`: Bounded `{ path, startLine, startColumn, endLine, endColumn }` validated to ensure end positions do not precede start positions.
- `SourceFileClassification`: Language enum, file role enum, byte size, detected frameworks, and line counts.
- `FunctionSymbol`, `ClassSymbol`, `InterfaceSymbol`, `TypeAliasSymbol`, `ImportExportSymbol`: Strongly-typed symbol models capturing signatures, modifiers, properties, and parameters.
- `AstDiagnostic`: Syntactic diagnostic codes, severity levels, and optional source locations.
- `AnalysisJobSummary`, `StageProgress`: Job status, stage progress indicators, retries, and timing.

### `@codaryn/file-classifier` (`packages/file-classifier/`)
Classifies files discovered in the ingested archive:
- **Language Detection**: TypeScript (`.ts`, `.mts`, `.cts`), TSX (`.tsx`), JavaScript (`.js`, `.mjs`, `.cjs`), JSX (`.jsx`), JSON (`.json`).
- **Semantic Role Detection**: `source`, `test`, `config`, `declaration`, `asset`, `documentation`, or `other`.
- **Framework Detection**: Inspects file patterns and imports to identify React, Next.js, Vue, Svelte, Express, Fastify, NestJS, and more.
- **Metric Extraction**: Line-of-code calculation and file size metering.

### `@codaryn/compiler` (`packages/compiler/`)
Integrates directly with the TypeScript Compiler API (`typescript`):
- `VirtualCompilerHost`: Implements `ts.CompilerHost` backed by an in-memory map of file paths to content strings. Prevents disk touching and sandboxes compilation.
- `TsconfigParser`: Parses and resolves `tsconfig.json` configurations, parsing `compilerOptions`, `include`, `exclude`, and `references`.
- `ProjectProgramManager`: Handles composite projects and multi-tsconfig setups, creating targeted `ts.Program` instances.

### `@codaryn/symbols` (`packages/symbols/`)
Generates deterministic ULID identifiers for symbols using `generateSymbolId`:
- Computes SHA-256 hash over `{ repositoryId, filePath, kind, parentScope, name }`.
- Encodes the first 16 bytes into a base32 ULID-compatible identifier.
- Ensures identical symbols across repeated runs produce stable identifiers.

### `@codaryn/ast` (`packages/ast/`)
Traverses the TypeScript AST using the visitor pattern:
- Extracts function and method signatures, parameters (type, optional, default), async/generator flags, and modifiers.
- Extracts class inheritance (`extends`), interface implementations (`implements`), members, and properties.
- Extracts interface declarations and type aliases with nested type members.
- Extracts import declarations, export declarations, default exports, namespace exports, and re-exports.
- Collects syntax diagnostics and parse errors into structured `AstDiagnostic` records.

### `workers/analysis` (`workers/analysis/src/processor.ts`)
Executes the sequential multi-stage analysis:
1. `inventory`: Classify all files in the archive.
2. `configuration`: Discover and parse `tsconfig.json` files and project references.
3. `parsing`: Parse source files into ASTs using the virtual compiler host.
4. `symbols`: Extract all top-level and nested symbols.
5. `diagnostics`: Collect syntactic diagnostics and error codes.
6. `completed`: Aggregate summaries and persist final job metrics.

Cancellation is cooperative: before each file is processed, `signal.aborted` is checked. If aborted, execution halts immediately and the job transitions to `cancelled`.

## 4. Relational Database Schema

Migration `0006_analysis_foundation.sql` creates the storage foundation:
- `analysis_jobs`: Tracks root job metadata, repository ID, manifest ID, current stage, status, retry counts, and completion timestamps.
- `analysis_stages`: Records per-stage status (`pending`, `running`, `completed`, `failed`, `skipped`), duration, items processed, and status messages.
- `analysis_files`: Stores classified source files with language, role, line counts, and framework tags.
- `analysis_symbols`: Stores extracted symbols as JSON payloads indexed by job ID, file path, kind, and name.
- `analysis_diagnostics`: Stores compiler diagnostics and syntax errors indexed by job ID, severity, and path.
- `analysis_job_logs`: Records timestamped log events tagged with stage and severity.
