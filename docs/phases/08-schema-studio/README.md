# Phase 8: Schema Studio and database intelligence

**Objective:** Build the first-class schema diagram experience.

This phase must be prioritized ahead of optional advanced analysis features.

### Frontend

Build Schema Studio.

Screens:

- Schema overview.
- ERD canvas.
- Table browser.
- Table inspector.
- Column inspector.
- Relation inspector.
- Schema source panel.
- Schema filters.
- Schema layouts.
- Schema export.
- Schema documentation.
- Schema comparison.

### Backend

- Schema extraction result persistence.
- Schema object APIs.
- Table and field APIs.
- Constraint APIs.
- Relationship APIs.
- Schema lineage APIs.
- Schema comparison endpoints.
- Export endpoints.
- Schema search and pagination.

### Analysis engine

Initial support:

- Prisma.
- Drizzle.
- SQL DDL.
- SQL migrations.

Extraction:

- Tables.
- Columns.
- Types.
- Nullability.
- Defaults.
- Primary keys.
- Foreign keys.
- Unique constraints.
- Indexes.
- Enums.
- Relations.

Later adapters:

- TypeORM.
- Sequelize.
- Mongoose.

### Schema visualization

- One-to-one relationships.
- One-to-many relationships.
- Many-to-many relationships.
- Join tables.
- Self-relations.
- Relationship labels.
- Table grouping.
- Domain boundaries.
- Compact layouts.
- Full ER layouts.

### Schema integration

Connect:

```text
Frontend Field
    |
API Request Property
    |
Backend DTO
    |
Controller
    |
Service
    |
Repository
    |
ORM Model
    |
Schema Table / Column
```

Every connection needs direct or inferred evidence status.

### Acceptance criteria

- Prisma models generate ERD diagrams.
- Drizzle schema declarations generate ERD diagrams.
- Supported SQL DDL generates schema models.
- Table and column source locations are visible.
- Foreign keys are correctly represented.
- Inferred relations are visually distinct.
- Schema diagrams can be exported.
- Schema documents reference the same schema snapshot.
- Schema comparison detects supported structural changes.

**Milestone:** A real, connected Schema Studio.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Phases 5 and 7 for graph, source evidence and backend links; frontend lineage also depends on Phase 6.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
