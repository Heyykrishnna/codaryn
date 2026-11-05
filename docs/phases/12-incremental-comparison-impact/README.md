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

**Status:** Implemented for the bounded static module/schema version projection. See [verification](verification.md) for actual outcomes and limits.

**Dependencies:** Immutable snapshots and domain analyzers from earlier phases; schema comparison uses Phase 8.

The `/comparisons` explorer and dedicated comparison worker implement immutable versions, compatible file-result reuse, optional full equivalence, architecture/schema diffs, potential dependency impact and opt-in signed-push scheduling.

- [Architecture and security](architecture.md)
- [Supported projection and limitations](supported-analysis.md)
- [API contracts](api.md)
- [Operations and recovery](operations.md)
- [Acceptance tests](acceptance-tests.md)
- [Verification evidence](verification.md)

[Full product specification](../../product-specification.md) · [All phases](../README.md)
