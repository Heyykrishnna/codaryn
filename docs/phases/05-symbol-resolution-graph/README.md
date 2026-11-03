# Phase 5: Symbol resolution and dependency graph

**Objective:** Understand how source files and symbols connect.

### Frontend

- Dependency graph.
- File dependency view.
- Module dependency view.
- Incoming and outgoing dependency panels.
- Circular dependency warnings.
- Unresolved dependency panel.
- Source evidence inspector.
- Search and filters.

### Backend

- Graph persistence.
- Graph aggregation APIs.
- Node search.
- Edge search.
- Neighborhood queries.
- Graph pagination.
- Graph snapshot retrieval.

### Analysis engine

- TypeScript TypeChecker.
- Module resolution.
- Symbol resolution.
- Import/export mapping.
- Re-export handling.
- Circular dependency detection.
- Strongly connected components.
- Dependency depth.
- Module coupling metrics.

### Acceptance criteria

- Resolved imports link to actual source files.
- Symbols have stable identities.
- Circular dependencies are identified.
- Unresolved references remain visible.
- Every confirmed edge contains source evidence.
- Large graph queries are paginated.

**Milestone:** The first complete interactive code graph.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Phase 4 parsing and symbol inventory.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
