# Phase 12: Incremental analysis, comparison and impact

**Objective:** Keep architecture synchronized with GitHub changes.

### Frontend

- Commit comparison.
- Architecture diff view.
- Added and removed nodes.
- Changed relationships.
- Schema diff view.
- Change impact explorer.
- Analysis history.
- Snapshot selection.

### Backend

- GitHub webhook processing.
- Commit comparison service.
- Incremental job scheduling.
- Snapshot comparison API.
- Graph version management.
- Impact result persistence.

### Analysis engine

- Changed file detection.
- File hash comparison.
- Dependency invalidation.
- Affected symbol detection.
- Selective analyzer execution.
- Graph reconciliation.
- Architecture drift rules.

### Acceptance criteria

- New commits trigger configured analysis.
- Unchanged files reuse compatible cached results.
- Changed files are reprocessed.
- Affected modules are identified.
- Historical snapshots remain immutable.
- Incremental results can be checked against a full analysis.

**Milestone:** Version-aware architecture intelligence.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Immutable snapshots and domain analyzers from earlier phases; schema comparison uses Phase 8.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
