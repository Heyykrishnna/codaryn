# Schema Studio API

All routes require a verified session. The server derives the actor from that session and verifies current membership in the requested workspace, including soft-deletion checks. Mutation requests also require the exact web Origin and `x-codaryn-request: workspace` header. Cross-workspace IDs do not grant access.

| Method and route                 | Inputs beyond workspaceId                               | Result                                                                    |
| -------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------- |
| POST `/api/v1/schema/request`    | jobId; optional inferRelations boolean                  | 202 with queued snapshot summary                                          |
| GET `/api/v1/schema/snapshots`   | Optional jobId and page                                 | Paginated summary history                                                 |
| GET `/api/v1/schema/overview`    | snapshotId                                              | Lifecycle, hash, counts, enums and bounded diagnostics                    |
| GET `/api/v1/schema/diagram`     | snapshotId; optional search, adapter                    | Bounded ERD tables, relationships and truncation status                   |
| GET `/api/v1/schema/tables`      | snapshotId; optional page, search, adapter              | Table summaries and total                                                 |
| GET `/api/v1/schema/table`       | snapshotId, tableId                                     | Table/columns/constraints, source, relations, lineage and unresolved gaps |
| GET `/api/v1/schema/column`      | snapshotId, tableId, columnId                           | Column detail and source evidence                                         |
| GET `/api/v1/schema/columns`     | snapshotId; optional tableId, search, adapter, page     | Paginated fields                                                          |
| GET `/api/v1/schema/constraints` | snapshotId; optional tableId, search, adapter, page     | Paginated constraint/index objects                                        |
| GET `/api/v1/schema/relations`   | snapshotId; optional tableId, search, adapter, page     | Evidence-labelled relations                                               |
| GET `/api/v1/schema/lineage`     | snapshotId; optional tableId, search, adapter, page     | Source lineage with confidence/evidence                                   |
| GET `/api/v1/schema/enums`       | snapshotId; optional search, adapter, page              | Paginated enum declarations                                               |
| GET `/api/v1/schema/compare`     | snapshotId, otherId                                     | Supported structural changes between two accessible snapshots             |
| GET `/api/v1/schema/export`      | snapshotId; format json/svg/markdown; layout er/compact | Immutable snapshot export as an attachment                                |

GET inputs are query parameters; request inputs are JSON. Workspace/job/snapshot IDs are UUIDs. Schema object IDs are bounded strings. Search is bounded to 100 characters. Adapter filters accept sql, prisma or drizzle. Enums in overview are a bounded preview; use the enums endpoint for the full list.

Expected errors: 400 malformed IDs/options, 401 missing session, 403 origin/header rejection, 404 absent/inaccessible workspace or resource, 409 pending/failed snapshot requested as completed data, 413 oversized request/comparison, and 429 excessive extraction requests. Large SVG exports return an explicit limit error; JSON and Markdown remain available for complete snapshots within the stored payload limit.

Completed snapshots remain readable to current workspace members if an installation is later disconnected, because they are historical workspace artifacts. New extraction is denied and running extraction cannot publish after access is revoked. Workspace deletion or membership revocation denies historical reads too.
