# Execution analyzer

Bounded static TS/JS execution analysis using an exclusively virtual compiler host. Source declarations are never executed. `extractExecution` returns a validated potential-static snapshot and deterministic hash. `executionPaths` and `executionNeighborhood` operate on that snapshot with explicit bounds.

See [Phase 9](../../docs/phases/09-execution-data-flow/README.md) for supported syntax, uncertainty, API and acceptance evidence.
