# Phase 3: Analysis Studio and user configuration

**Objective:** Give users control over what the platform analyzes.

This phase is important because it determines the entire analysis workflow.

### Frontend

Build a complete multi-step Analysis Studio.

Screens:

1. Select repository.
2. Select branch and commit.
3. Select analysis profile.
4. Choose frontend analyzers.
5. Choose backend analyzers.
6. Choose database and schema analyzers.
7. Choose infrastructure analyzers.
8. Choose analysis depth.
9. Configure exclusions.
10. Choose diagrams.
11. Choose documents.
12. Review and start.

Additional features:

- Multi-selection.
- Preset cards.
- Analyzer descriptions.
- Required dependency indicators.
- Recommended configuration.
- Save custom presets.
- Duplicate presets.
- Reset to defaults.
- Configuration preview.

### Backend

- Analysis profile CRUD.
- Configuration validation.
- Analyzer compatibility validation.
- Dependency resolution.
- Configuration versioning.
- Configuration hashing.
- Analysis manifest creation.

### Analysis engine

Build an analyzer registry.

Each analyzer declares:

- ID.
- Version.
- Supported file types.
- Framework requirements.
- Dependencies.
- Configuration schema.
- Estimated resource category.

### Acceptance criteria

- Users can select multiple analysis modules.
- Invalid selections produce clear messages.
- Required analyzers are automatically added or explained.
- Saved presets can be reused.
- The backend validates all configuration independently of the frontend.
- The same configuration produces the same analysis manifest.

## Planning and dependencies

**Status:** Implemented. See [verification](verification.md) for executed checks and validation limits.

**Dependencies:** Phases 0–2 for contracts, workspace and repository selection.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)

## Implementation guides

- [Architecture and contracts](architecture.md)
- [API reference](api.md)
- [Operations and security](operations.md)
- [Verification evidence](verification.md)

The twelve-step wizard is available at `/studio`. Phase 3 creates durable, reproducible analysis manifests with status `configured`; analyzer execution and output rendering belong to subsequent phases.
