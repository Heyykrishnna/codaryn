# Phase 5: Operations & Runbook

## 1. Graph Worker Profile and Performance

The dependency graph resolution engine runs within the `graph` stage of the analysis worker (`workers/analysis`). The graph builder, cycle detector, and metrics calculator execute in-memory with strict algorithmic bounds:

- **Time Complexity**:
  - Module resolution: $O(M)$ where $M$ is the number of import specifiers.
  - Symbol linking: $O(S)$ where $S$ is the number of exported and imported symbols.
  - Tarjan SCC cycle detection: $O(V + E)$ where $V$ is the number of graph nodes and $E$ is the number of directed edges.
  - Coupling & Instability metrics: $O(V + E)$.
- **Memory Footprint**: Average memory consumption during graph synthesis is under 150 MB above baseline AST parser memory.
- **Batch Persistence**: Graph nodes, edges, cycles, and metrics are written in chunked batches (500 records per transaction) to prevent database connection saturation.

## 2. Query Bounding & Safeguards

To prevent performance degradation on large codebases:

- **Neighborhood Exploration Bounding**: The `/neighborhood` API strictly bounds traversal depth between 1 and 3 hops (`min: 1, max: 3`). Queries requesting higher depths are rejected with HTTP 400.
- **Snapshot Node Bounding**: Full graph snapshots enforce a maximum pagination limit of 500 nodes per page (`max: 500`, default: 100).
- **Search Filtering**: Substring search runs against indexed path and label columns to minimize in-memory filtering.
- **Workspace Isolation**: Database queries strictly filter by `job_id` joined against `analysis_jobs.workspace_id`. Any attempt to access a job belonging to another workspace fails with an explicit 404/403.

## 3. Failure Modes and Recovery

| Failure Scenario | Root Cause | System Response | Operator / User Action |
|---|---|---|---|
| **Infinite Barrel Re-export Loop** | Recursive `export * from ...` cycles | Symbol linker maintains a visited file set; breaks recursive traversal safely. | System self-recovers. Cycle reported in cycle alerts. |
| **Missing Tsconfig Path Alias** | Source uses alias undefined in `tsconfig.json` | Reference recorded in `analysis_unresolved_references` as `missing_file`. | User updates `tsconfig.json` `paths` property and triggers re-analysis. |
| **Third-Party External Package** | Import references external library (e.g. `react`) | Classified as `external_package` in unresolved references table; no artificial edge is created. | Normal expected behavior. Can be inspected in Unresolved References panel. |
| **Out-of-Memory on Enormous Repo** | Extreme node and edge count (>500,000) | Worker memory limit triggers graceful failure; job transitions to `failed`. | Increase worker memory allocation or configure exclude paths in repository settings. |

## 4. Operational Monitoring & Telemetry

The following operational metrics are tracked in `analysis_job_logs` and relational metrics tables:

- `graph_nodes_total`: Count of module and declaration nodes identified.
- `graph_edges_total`: Count of directed dependency edges established.
- `cycles_detected_total`: Total circular dependency loops identified.
- `unresolved_references_total`: Count of external or missing references recorded.
- `graph_stage_duration_ms`: Duration of the `graph` worker stage in milliseconds.
- `average_instability`: Average instability index across repository modules.

## 5. Security & Privacy Safeguards

- **Zero Host Filesystem Leakage**: Path resolution operates purely on normalized in-memory strings; path traversal exploits (`../../etc/passwd`) are blocked by path normalization.
- **No Source Code Duplication**: Graph edges record only symbol names, module specifiers, and line/column ranges. Full file contents are never copied into graph tables.
- **Deterministic Hashing**: Node and cycle IDs use cryptographic SHA-256 ULIDs, ensuring tamper-proof, reproducible references.
