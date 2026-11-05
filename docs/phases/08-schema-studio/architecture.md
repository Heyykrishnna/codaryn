# Schema Studio architecture

## Data flow

The `/schema` screen requests extraction for an existing workspace analysis job. The API resolves that job to its persisted repository and immutable commit, verifies current workspace/repository access, captures the installation generation and creates a durable schema request. The browser never submits source code or a database connection string.

The dedicated `@codaryn/schema-worker` claims requests using PostgreSQL `FOR UPDATE SKIP LOCKED`. It downloads the pinned GitHub archive through the existing constrained gateway and archive validator, reads supported source files in bounded batches and calls `extractSchema(files, inferRelations)`. No project code, SQL, Prisma generator or Drizzle configuration is executed. The worker verifies commit access and installation generation again before publishing.

The schema engine hides source adapters behind one extraction interface. SQL uses a bounded token reader and a supported DDL subset; Prisma uses block/field declarations; Drizzle uses the installed TypeScript AST. All three produce the contracts in `packages/contracts/src/schema-studio.ts`. This keeps persistence, API and visualization independent of adapter syntax.

## Snapshot model

A format-version-1 snapshot contains tables, columns, constraints, relationships, enums, lineage and diagnostics. Every table/column has a source path and line range. Tables retain up to 16,000 characters of their declaration for the source inspector. Identity combines adapter, namespace and declared database name; column/constraint/relation IDs are deterministic hashes. Prisma `@@map`/`@map` and Drizzle explicit database names are preserved.

The canonical snapshot sorts tables, relations, enums and lineage, deduplicates identical diagnostics and hashes its JSON using SHA-256. Identical inputs, regardless of file-map insertion order, produce the same hash. Source evidence and declaration text are part of the content hash. Structural comparison deliberately excludes source locations and formatting, while comparing supported table, column, constraint, relationship and enum properties.

An extraction request ID is different from a content hash. Repeating a request creates a separate audited request, but identical content can have the same hash. Completed snapshots are immutable through the public API and worker state machine. Exports include the request ID and hash; JSON also includes the pinned commit. The document, ERD and inspectors read the same persisted snapshot.

## Relationship semantics

- `DIRECT` means an explicit SQL/Prisma/Drizzle relation declaration.
- `RESOLVED` many-to-many paths are mechanically derived through an explicit join table with two declared foreign keys and a matching unique/primary key.
- `INFERRED` is reserved for optional, unambiguous `_id` naming heuristics and source-level application naming associations.
- `UNRESOLVED` means a referenced table/column/key is missing or ambiguous. It is retained for inspection and never presented as confirmed connectivity.

Foreign-key uniqueness determines one-to-one versus one-to-many. A component of a composite key is not independently unique. Nullable keys remain visibly nullable. Self-relations use loop geometry. Explicit join tables remain visible alongside their derived many-to-many path. Solid diagram lines represent declared/resolved relations; dashed amber lines represent inference.

Tables are grouped deterministically by source domain and identity. Full ER layout displays the first eleven columns per table; compact layout displays table/domain labels. The inspector and JSON/Markdown exports retain complete columns and constraints. The canvas displays at most 100 matching tables and explicitly identifies truncation. Filter larger schemas or export the complete model.

## Application lineage

ORM declaration → schema table is directly evidenced. Unambiguous Drizzle-style repository calls and DTO properties in the associated source file can produce `INFERRED` links with source evidence. This does not establish runtime data flow. Frontend/API/controller/service connections without supported evidence are explicitly shown as unresolved gaps. Phase 8 does not invent an end-to-end path from matching display names.

## Persistence

Migration `0011_schema_studio.sql` adds `analysis_schema_snapshots`. It stores the workspace, repository, actor, job, commit, installation generation, inference option, lifecycle status, attempts, lease identity/time, content hash, snapshot and counts. Foreign keys, lifecycle/attempt/hash/completion checks and workspace/job/queue indexes protect integrity. Matching Drizzle declarations participate in `db:verify`.

The snapshot is JSONB, while request/provenance/queue fields are ordinary indexed columns. APIs load one bounded immutable snapshot for object inspection, apply filters and paginate the result. List queries project only summary fields and do not load historical payloads. A future normalized object index can be added if measured query volume justifies it.
