# Phase 5: Symbol Resolution and Dependency Graph Architecture

## 1. System Overview

Phase 5 extends the static analysis engine from isolated single-file AST extraction into a semantic code graph connecting modules, declarations, and references across the repository. The architecture is guided by six core design principles:

1. **Deterministic Module Resolution**: File paths, tsconfig path aliases (`paths`, `baseUrl`), directory index probing, and monorepo package roots resolve without executing filesystem lookups or shell commands.
2. **Accurate Cross-File Symbol Linking**: Resolves named imports, default imports, namespace imports, and recursive barrel re-exports (`export * from ...`) directly to target symbol declarations.
3. **Graph Integrity & Honest Uncertainty**: If an import targets an external package or an unresolvable path, it is stored in an unresolved reference inventory rather than inventing artificial edges.
4. **Linear-Time Cycle Detection**: Identifies circular dependency loops using Tarjan's Strongly Connected Components (SCC) algorithm in $O(V + E)$ time, extracting ordered cycle paths.
5. **Coupling & Architectural Metrics**: Computes afferent coupling ($C_a$), efferent coupling ($C_e$), instability index ($I = \frac{C_e}{C_a + C_e}$), and dependency tree depth per module.
6. **Multi-Tenant Graph Isolation**: Graph models are stored across normalized relational tables, partitioned by analysis job and workspace, and queried with pagination and bounded neighborhood traversals.

## 2. Component Architecture

```
                          ┌───────────────────────────┐
                          │   Next.js Web Dashboard   │
                          │   (/graph Explorer & UI)  │
                          └─────────────┬─────────────┘
                                        │ HTTP / REST
                                        ▼
                          ┌───────────────────────────┐
                          │      Fastify API Host     │
                          │     (/api/v1/graph/*)     │
                          └─────────────┬─────────────┘
                                        │ Tenant Queries
                                        ▼
    ┌───────────────────────────────────────────────────────────────────────┐
    │                         Analysis Worker Pipeline                      │
    │                                                                       │
    │  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐  │
    │  │ File         │────▶│ tsconfig     │────▶│ AST Symbol           │  │
    │  │ Classifier   │     │ Resolution   │     │ Extraction           │  │
    │  └──────────────┘     └──────────────┘     └──────────┬───────────┘  │
    │                                                       │               │
    │                                                       ▼               │
    │  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────┐  │
    │  │ Tarjan SCC   │◀────│ Cross-File   │◀────│ Module Path          │  │
    │  │ Cycle Engine │     │ Symbol Linker│     │ Resolver             │  │
    │  └──────┬───────┘     └──────────────┘     └──────────────────────┘  │
    │         │                                                             │
    │         ▼                                                             │
    │  ┌──────────────┐                                                     │
    │  │ Graph &      │                                                     │
    │  │ Metrics Calc │                                                     │
    │  └──────┬───────┘                                                     │
    └─────────┼─────────────────────────────────────────────────────────────┘
              │ Batch Insert
              ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                           PostgreSQL Database                             │
│                                                                           │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────┐  │
│  │ analysis_graph_nodes  │  │ analysis_graph_edges  │  │ graph_cycles  │  │
│  └───────────────────────┘  └───────────────────────┘  └───────────────┘  │
│  ┌───────────────────────┐  ┌───────────────────────┐                     │
│  │ analysis_graph_metrics│  │ unresolved_references │                     │
│  └───────────────────────┘  └───────────────────────┘                     │
└───────────────────────────────────────────────────────────────────────────┘
```

## 3. Core Packages and Responsibilities

### `@codaryn/contracts` (`packages/contracts/src/graph.ts`, `src/evidence.ts`)
Defines the authoritative schemas, discriminated unions, and types:
- `DependencyGraphNode`: Nodes representing modules or symbols with incoming/outgoing counts, language, and role.
- `DependencyGraphEdge`: Edges with source and target IDs, edge kind (`import`, `re_export`, `call`, `type_reference`, `heritage`), specifier, symbol names, and `SourceEvidence`.
- `DependencyCycle`: Cycle identifier, ordered cycle path, and node identifiers participating in the circular dependency.
- `ModuleCouplingMetric`: Module path, afferent coupling ($C_a$), efferent coupling ($C_e$), instability index ($I$), and dependency depth.
- `UnresolvedReference`: File path, import specifier, symbol name, source evidence, and reason code (`external_package`, `missing_file`, `unresolved_symbol`).
- `SourceEvidence`: Source file path, start/end line and column locations, and optional context snippets.

### `@codaryn/module-resolver` (`packages/module-resolver/`)
Provides pure, in-memory resolution of module specifiers:
- **Relative Path Resolution**: Normalizes paths (`./`, `../`), resolves explicit extensions (`.ts`, `.tsx`, `.js`, `.jsx`), and probes directory index files (`index.ts`, `index.tsx`, `index.js`).
- **Tsconfig Path Aliases**: Supports `compilerOptions.paths` and `compilerOptions.baseUrl`, matching prefix wildcards (e.g., `@components/*` -> `src/components/*`).
- **Monorepo Package Root Mapping**: Resolves inter-package dependencies in monorepos via package root mappings.
- **External Package Classification**: Distinguishes between internal repository files and third-party external dependencies (e.g., `react`, `zod`, node built-ins).

### `@codaryn/symbol-resolver` (`packages/symbol-resolver/`)
Links module-level import declarations to target declarations:
- **Named Imports**: Matches `import { Foo } from "./bar"` against exported functions, classes, interfaces, or types in the target file.
- **Default Exports**: Matches `import Foo from "./bar"` against `export default` declarations.
- **Namespace Imports**: Handles `import * as Bar from "./bar"`.
- **Recursive Barrel Re-Exports**: Navigates `export * from "./submodule"` and `export { X } from "./submodule"` chains to discover the canonical declaring file.
- **Deterministic Identity**: Creates reproducible symbol and node identifiers using SHA-256 hashes encoded in ULID format.

### `@codaryn/dependency-graph` (`packages/dependency-graph/`)
Synthesizes graph relationships and calculates structural metrics:
- **Graph Builder**: Assembles graph nodes and edges from resolved symbols and file classifications.
- **Tarjan SCC Algorithm**: Computes strongly connected components in $O(V + E)$ linear time. Extracts cycles containing two or more nodes (or self-referencing loops) with ordered cycle path arrays.
- **Coupling & Instability Metrics**:
  - Afferent Coupling ($C_a$): Number of other modules depending on this module.
  - Efferent Coupling ($C_e$): Number of other modules this module depends upon.
  - Instability ($I$): $I = \frac{C_e}{C_a + C_e}$ (ranging from 0 = completely stable to 1 = completely unstable).
  - Depth: Length of the longest path in the dependency directed acyclic graph.
- **Neighborhood Subgraphs**: Bounded graph extraction up to a configurable depth (1 to 3 hops) along incoming, outgoing, or bidirectional edges.

### `workers/analysis` (`workers/analysis/src/processor.ts`)
Executes the `graph` stage within the analysis pipeline:
- Sits immediately after the `symbols` extraction stage and before `diagnostics`.
- Resolves all imports across all discovered repository source files.
- Identifies cycles and computes module coupling metrics.
- Persists nodes, edges, cycles, metrics, and unresolved references to the database in bulk transactions.

### `apps/api` (`apps/api/src/graph/`)
Exposes REST endpoints backed by workspace-isolated database queries:
- `GET /api/v1/graph/snapshot`: Full repository dependency graph with pagination and search filtering.
- `GET /api/v1/graph/neighborhood`: Focused subgraph centered around a selected node.
- `GET /api/v1/graph/cycles`: List of circular dependency loops.
- `GET /api/v1/graph/unresolved`: Unresolved reference inventory.
- `GET /api/v1/graph/metrics`: Module coupling and instability rankings.

### `apps/web` (`apps/web/src/features/graph/`, `apps/web/app/graph/page.tsx`)
Interactive web UI dashboard:
- SVG-based graph visualization with responsive layouts and zoom/pan controls.
- Cycle alerts showing full circular import paths.
- Neighborhood explorer with configurable depth controls.
- Unresolved references drawer with provenance explanations.
- Evidence drawer displaying exact start/end line and column numbers.

## 4. Relational Database Schema

Migration `0007_dependency_graph.sql` provides the persistence model:

```sql
CREATE TABLE analysis_graph_nodes (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    label TEXT NOT NULL,
    kind TEXT NOT NULL,
    symbol_id TEXT,
    language TEXT NOT NULL,
    role TEXT NOT NULL,
    incoming_count INTEGER NOT NULL DEFAULT 0,
    outgoing_count INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_graph_edges (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    source_node_id TEXT NOT NULL REFERENCES analysis_graph_nodes(id) ON DELETE CASCADE,
    target_node_id TEXT NOT NULL REFERENCES analysis_graph_nodes(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    specifier TEXT NOT NULL,
    imported_name TEXT,
    resolved_name TEXT,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_graph_cycles (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    path TEXT[] NOT NULL,
    node_ids TEXT[] NOT NULL,
    length INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_graph_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    afferent_coupling INTEGER NOT NULL,
    efferent_coupling INTEGER NOT NULL,
    instability NUMERIC(5, 4) NOT NULL,
    depth INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_unresolved_references (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    path TEXT NOT NULL,
    specifier TEXT NOT NULL,
    imported_name TEXT,
    reason TEXT NOT NULL,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Indexes are created on `(job_id, path)`, `(job_id, source_node_id)`, `(job_id, target_node_id)`, and `(job_id, cycle_id)` to ensure high-performance query execution.
