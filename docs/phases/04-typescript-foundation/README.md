# Phase 4: TypeScript analysis foundation

**Objective:** Build the core static analysis engine.

### Frontend

- Analysis progress dashboard.
- Repository file inventory.
- Project structure explorer.
- File type summary.
- Parse error panel.
- Analyzer coverage indicators.
- Analysis stage timeline.

### Backend

- Analysis orchestration.
- Job creation.
- Job progress APIs.
- Job cancellation.
- Retry policies.
- Stage result persistence.
- Analyzer execution logs.

### Analysis engine

- TypeScript Compiler API integration.
- Compiler host.
- tsconfig discovery.
- Project reference handling.
- AST parser.
- Source file classification.
- Symbol extraction.
- Function extraction.
- Class extraction.
- Interface and type extraction.
- Import and export extraction.
- Diagnostics.

### Acceptance criteria

- TypeScript files parse correctly.
- TSX is supported.
- JavaScript within the project is supported.
- Multiple tsconfig files are handled.
- Parser errors do not crash entire runs.
- Every extracted symbol has source locations.
- Unsupported constructs are reported.

**Milestone:** A functioning TypeScript repository analyzer.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Phases 0–3 for configuration, ingestion and job foundation.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
