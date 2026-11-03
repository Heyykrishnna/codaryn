# Phase 6: Frontend architecture intelligence

**Objective:** Reconstruct the supported frontend architecture.

### Frontend

Build the Frontend Explorer with:

- Application overview.
- Component hierarchy.
- Page structure.
- Routing view.
- State management view.
- Hooks view.
- Context provider view.
- API client view.
- Component detail inspector.
- Search and path highlighting.

### Backend

- Frontend graph APIs.
- Component search.
- Component details.
- Rendering relationship endpoints.
- Route and hook query services.
- Component dependency queries.

### Analysis engine

- React component detection.
- JSX relationship extraction.
- Hook reference extraction.
- Context provider and consumer detection.
- Router detection.
- Route-to-page mapping.
- State management patterns.
- API client identification.
- Lazy import detection.

### Acceptance criteria

- Recognized components are indexed.
- Detected component references are linked.
- Page and route structures are visible.
- Hook and context relationships are traceable.
- API clients link to known backend endpoints only when evidence supports the mapping.

**Milestone:** Frontend architecture exploration.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Phase 5 graph and evidence; backend cross-links depend on Phase 7.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
