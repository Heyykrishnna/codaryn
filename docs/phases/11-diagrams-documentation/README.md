# Phase 11: Diagram and documentation system

**Objective:** Make every analysis output understandable, exportable and connected.

### Frontend

- Diagram workspace.
- Documentation workspace.
- Search across generated documents.
- Source links.
- Saved diagrams.
- Export interface.
- Markdown preview.
- Diagram legends.
- Layout controls.

### Backend

- Diagram generation jobs.
- Graph serialization.
- Layout configuration storage.
- Document template execution.
- Export processing.
- Artifact storage.
- Document versioning.

### Analysis engine

- System architecture renderer.
- Frontend architecture renderer.
- Backend architecture renderer.
- API architecture renderer.
- ERD renderer.
- Dependency graph renderer.
- Execution flow renderer.
- Infrastructure renderer.
- Documentation template registry.

### Acceptance criteria

- All outputs use the same analysis snapshot.
- Every confirmed architecture claim has supporting evidence.
- Diagrams can be exported.
- Documentation can be exported.
- Saved layouts remain available.
- Generated documents carry analyzer and commit metadata.

**Milestone:** Complete architecture and documentation workspace.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Relevant domain outputs from Phases 5–10; individual renderers can ship as their inputs mature.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
