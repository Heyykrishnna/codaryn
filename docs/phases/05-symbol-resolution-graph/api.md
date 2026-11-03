# Phase 5: Dependency Graph API Reference

All graph API endpoints are mounted under `/api/v1/graph` on the Fastify API server. Every request requires tenant authentication and a valid `workspaceId` query parameter matching the repository's enclosing workspace.

---

### 1. Get Dependency Graph Snapshot

Retrieves a paginated graph snapshot containing nodes, directed edges, and summary counts.

- **Method**: `GET`
- **Path**: `/api/v1/graph/snapshot`
- **Query Parameters**:
  - `workspaceId`: UUID of the workspace (required)
  - `jobId`: UUID of the analysis job (required)
  - `limit`: Number of nodes to return (optional, default: 100, max: 500)
  - `offset`: Pagination offset (optional, default: 0)
  - `search`: Substring filter for node path or label (optional)
- **Response**: `200 OK`
  ```json
  {
    "jobId": "018f3a2b-4444-7000-8000-000000000004",
    "nodes": [
      {
        "id": "node_018f3a2b444470008000000000000001",
        "path": "src/app.ts",
        "label": "src/app.ts",
        "kind": "module",
        "symbolId": null,
        "language": "typescript",
        "role": "source",
        "incomingCount": 0,
        "outgoingCount": 2,
        "metadata": {}
      }
    ],
    "edges": [
      {
        "id": "edge_018f3a2b444470008000000000000002",
        "sourceNodeId": "node_018f3a2b444470008000000000000001",
        "targetNodeId": "node_018f3a2b444470008000000000000003",
        "kind": "import",
        "specifier": "./math",
        "importedName": "add",
        "resolvedName": "add",
        "sourceEvidence": {
          "filePath": "src/app.ts",
          "startLine": 1,
          "startColumn": 1,
          "endLine": 1,
          "endColumn": 28,
          "contextSnippet": "import { add } from './math';"
        }
      }
    ],
    "totalNodes": 1,
    "totalEdges": 1,
    "cyclesCount": 0,
    "unresolvedCount": 0
  }
  ```

---

### 2. Get Node Neighborhood Subgraph

Extracts a bounded subgraph centered around a specific target node up to a designated depth.

- **Method**: `GET`
- **Path**: `/api/v1/graph/neighborhood`
- **Query Parameters**:
  - `workspaceId`: UUID (required)
  - `jobId`: UUID (required)
  - `nodeId`: Target node ID to explore (required)
  - `depth`: Exploration distance (optional, integer between 1 and 3, default: 1)
  - `direction`: Traversal direction (optional, enum: `incoming`, `outgoing`, `both`, default: `both`)
- **Response**: `200 OK`
  ```json
  {
    "centerNodeId": "node_018f3a2b444470008000000000000001",
    "depth": 1,
    "direction": "both",
    "nodes": [ ... ],
    "edges": [ ... ]
  }
  ```

---

### 3. Get Circular Dependency Cycles

Retrieves all circular dependency loops discovered via Tarjan's Strongly Connected Components algorithm.

- **Method**: `GET`
- **Path**: `/api/v1/graph/cycles`
- **Query Parameters**:
  - `workspaceId`: UUID (required)
  - `jobId`: UUID (required)
- **Response**: `200 OK`
  ```json
  {
    "jobId": "018f3a2b-4444-7000-8000-000000000004",
    "cycles": [
      {
        "id": "cycle_018f3a2b444470008000000000000005",
        "path": ["src/cycle-a.ts", "src/cycle-b.ts", "src/cycle-a.ts"],
        "nodeIds": [
          "node_018f3a2b444470008000000000000001",
          "node_018f3a2b444470008000000000000002"
        ],
        "length": 2
      }
    ],
    "totalCycles": 1
  }
  ```

---

### 4. Get Unresolved References

Retrieves references that could not be linked to internal declarations (e.g. third-party npm packages or missing modules).

- **Method**: `GET`
- **Path**: `/api/v1/graph/unresolved`
- **Query Parameters**:
  - `workspaceId`: UUID (required)
  - `jobId`: UUID (required)
  - `limit`: Number of items to return (optional, default: 100, max: 500)
  - `offset`: Pagination offset (optional, default: 0)
- **Response**: `200 OK`
  ```json
  {
    "jobId": "018f3a2b-4444-7000-8000-000000000004",
    "references": [
      {
        "id": "unres_018f3a2b444470008000000000000006",
        "path": "src/app.ts",
        "specifier": "react",
        "importedName": "useState",
        "reason": "external_package",
        "sourceEvidence": {
          "filePath": "src/app.ts",
          "startLine": 2,
          "startColumn": 1,
          "endLine": 2,
          "endColumn": 34,
          "contextSnippet": "import { useState } from 'react';"
        }
      }
    ],
    "totalCount": 1
  }
  ```

---

### 5. Get Module Coupling Metrics

Retrieves architectural coupling and instability metrics for all modules in the repository.

- **Method**: `GET`
- **Path**: `/api/v1/graph/metrics`
- **Query Parameters**:
  - `workspaceId`: UUID (required)
  - `jobId`: UUID (required)
  - `limit`: Number of items to return (optional, default: 100, max: 500)
  - `offset`: Pagination offset (optional, default: 0)
  - `sortBy`: Metric to sort by (optional, enum: `afferentCoupling`, `efferentCoupling`, `instability`, `depth`, default: `instability`)
  - `sortDirection`: Sort order (optional, enum: `asc`, `desc`, default: `desc`)
- **Response**: `200 OK`
  ```json
  {
    "jobId": "018f3a2b-4444-7000-8000-000000000004",
    "metrics": [
      {
        "path": "src/app.ts",
        "afferentCoupling": 0,
        "efferentCoupling": 5,
        "instability": 1.0,
        "depth": 2
      },
      {
        "path": "src/utils/math.ts",
        "afferentCoupling": 3,
        "efferentCoupling": 0,
        "instability": 0.0,
        "depth": 0
      }
    ],
    "totalCount": 2
  }
  ```
