# Phase 11: Diagram and documentation system

**Objective:** Make every analysis output understandable, exportable and connected.

### Frontend

- Diagram workspace (`/architecture`): Interactive canvas with node dragging, zoom, pan, fit-to-view, source file links, and confidence legend.
- Documentation workspace (`/documentation`): Studio with deterministic template navigation, full-text tokenized search, analyzer metadata, and markdown preview.
- Saved layouts: Local edits saved directly to server-side persistence (`saved_diagram_layouts`).
- Export interface: Modal triggering asynchronous export jobs in SVG, DBML, Markdown, HTML/PDF, Mermaid, and JSON with live status polling and direct download.
- Diagram legends: Categorized node shapes, edge types, and confidence indicators (confirmed with line evidence vs inferred/unresolved).

### Backend

- Diagram retrieval & layout persistence: Fastify endpoints under `/api/v1/workspaces/:workspaceId/analysis/:jobId/diagrams` with layout schema validation.
- Documentation retrieval: Fastify endpoints under `/api/v1/workspaces/:workspaceId/analysis/:jobId/documentation` supporting template rendering and search queries.
- Export job queue & worker: Fastify endpoints under `/api/v1/workspaces/:workspaceId/analysis/:jobId/exports` with rate limiting, atomic job creation, and background polling.
- Tenant isolation & artifact storage: Export artifacts stored with SHA-256 integrity verification, tenant-scoped access checks, and download streaming.

### Analysis engine

- System architecture renderer: Combines services, databases, entry points, and high-level boundaries.
- Frontend architecture renderer: Visualizes pages, components, client-side routing, and state stores.
- Backend architecture renderer: Visualizes controllers, services, repositories, and routes.
- API architecture renderer: Visualizes HTTP route graphs, methods, parameters, and handler connections.
- ERD renderer: Database tables, columns, primary keys, and foreign-key relations.
- Dependency graph renderer: Module-level import/export package relationships.
- Execution flow renderer: Function calls, invocation paths, and control flow transitions.
- Infrastructure renderer: Containers, Docker services, CI/CD workflows, and environment boundaries.
- Documentation template registry: Deterministic generators for Architecture Overview, System Boundaries, Frontend Components, API Reference, Data Models, Data Flow, Security Considerations, Deployment Architecture, Infrastructure Inventory, and Quality Baseline.

### Acceptance criteria

- All outputs use the same analysis snapshot.
- Every confirmed architecture claim has supporting evidence.
- Diagrams can be exported in SVG, Mermaid, DBML, and JSON.
- Documentation can be exported in Markdown, HTML, and JSON.
- Saved layouts remain available across sessions and exports.
- Generated documents carry analyzer and commit metadata.

**Milestone:** Complete architecture and documentation workspace.

## Planning and dependencies

**Status:** Implemented. See [architecture](architecture.md), [operations](operations.md), and [verification](verification.md).

**Dependencies:** Domain analysis outputs from Phases 5–10 (symbols, frontend, backend, schema, execution, and infrastructure).

- [Architecture and security boundaries](architecture.md)
- [Operations and deployment](operations.md)
- [Acceptance tests](acceptance-tests.md)
- [Verification evidence](verification.md)

[Full product specification](../../product-specification.md) · [All phases](../README.md)
