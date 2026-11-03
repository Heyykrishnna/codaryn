# Phase 5: Symbol resolution and dependency graph

**Objective:** Understand how source files and symbols connect.

### Frontend

- Interactive dependency graph dashboard (`apps/web/app/graph/page.tsx`).
- File and module dependency view (`DependencyGraphView`).
- Interactive neighborhood inspector (`NeighborhoodPanel`).
- Incoming and outgoing dependency panels with depth traversal.
- Circular dependency warnings with loop paths (`DependencyCyclesPanel`).
- Unresolved dependency panel (`UnresolvedReferencesPanel`).
- Source evidence inspector with line range provenance (`SourceEvidenceInspector`).
- Module coupling & instability metrics table (`ModuleMetricsPanel`).
- Search and multi-criteria filters (resolution, kind, search text).

### Backend

- Graph persistence across normalized relational tables (`analysis_graph_nodes`, `analysis_graph_edges`, `analysis_graph_cycles`, `analysis_graph_metrics`, `analysis_unresolved_references`).
- Graph aggregation and snapshot APIs (`GET /api/v1/graph/snapshot`).
- Subgraph neighborhood traversal APIs (`GET /api/v1/graph/neighborhood`).
- Cycle retrieval APIs (`GET /api/v1/graph/cycles`).
- Unresolved reference inspection APIs (`GET /api/v1/graph/unresolved`).
- Module coupling metrics APIs (`GET /api/v1/graph/metrics`).
- Multi-tenant workspace isolation on all graph queries.

### Analysis engine

- Deterministic module resolution (`@codaryn/module-resolver`) for relative paths, index probing, and TypeScript extension mapping.
- Tsconfig path alias resolution (`paths`, `baseUrl`).
- Monorepo package root mapping.
- Cross-file symbol linker (`@codaryn/symbol-resolver`) supporting named imports, default exports, namespace imports, and recursive barrel re-exports.
- Circular dependency detection via Tarjan's Strongly Connected Components algorithm (`@codaryn/dependency-graph`).
- Dependency depth calculation and instability metrics ($C_a$, $C_e$, $I = \frac{C_e}{C_a + C_e}$).
- Source evidence tracking linking every confirmed relationship to exact line numbers.

### Acceptance criteria

- [x] Resolved imports link to actual source files and symbol IDs.
- [x] Symbols have stable, deterministic identities across analysis runs.
- [x] Circular dependencies are detected and loop paths extracted.
- [x] Unresolved references remain visible without inventing false edges.
- [x] Every confirmed edge contains navigable source evidence line ranges.
- [x] Graph queries support pagination, bounded neighborhood traversal, and filtering.

**Milestone:** The first complete interactive code graph.

## Planning and dependencies

**Status:** Implemented. All acceptance criteria and verification scenarios have been executed with passing results.

**Dependencies:** Phase 4 parsing and symbol inventory.

## Key Implementation Artifacts

1. `@codaryn/contracts` (`packages/contracts/src/graph.ts`):
   - Strict Zod schemas for dependency nodes, edges, cycles, module coupling metrics, and unresolved references.
2. `@codaryn/module-resolver` (`packages/module-resolver/`):
   - In-memory path resolution engine handling relative imports, file extensions, tsconfig path aliases, and monorepo packages.
3. `@codaryn/symbol-resolver` (`packages/symbol-resolver/`):
   - Cross-file symbol linker mapping import statements to target symbols through direct declarations and barrel re-exports.
4. `@codaryn/dependency-graph` (`packages/dependency-graph/`):
   - Graph builder, Tarjan SCC cycle detection, module coupling calculations, and bounded neighborhood traversals.
5. `@codaryn/database` (`packages/database/migrations/0007_dependency_graph.sql`):
   - Relational tables and indices for graph nodes, edges, cycles, metrics, and unresolved references.
6. `workers/analysis` (`workers/analysis/src/processor.ts`):
   - Integrated `graph` stage into the multi-stage analysis worker pipeline.
7. `apps/api` (`apps/api/src/graph/`):
   - REST endpoints with workspace isolation for graph snapshots, neighborhoods, cycles, unresolved references, and metrics.
8. `apps/web` (`apps/web/src/features/graph/`, `apps/web/app/graph/`):
   - Interactive SVG dependency graph, neighborhood panels, cycle alerts, evidence inspectors, and metrics tables.

[Full product specification](../../product-specification.md) · [All phases](../README.md) · [Acceptance test report](acceptance-tests.md) · [Architecture](architecture.md) · [API Reference](api.md) · [Operations Guide](operations.md)
