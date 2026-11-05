# Execution API

Every route requires a verified session and current membership in an undeleted workspace. Tenant identifiers alone never grant access. Mutation requests require the exact configured web Origin and `x-codaryn-request: workspace`. All responses use no-store caching.

| Route                                | Inputs beyond workspaceId                     | Result                                                                      |
| ------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------- |
| POST `/api/v1/execution/request`     | jobId                                         | 202 queued snapshot capturing the pinned commit and installation generation |
| GET `/api/v1/execution/jobs`         | None                                          | Latest 20 eligible connected-repository analysis jobs                       |
| GET `/api/v1/execution/snapshots`    | page                                          | Paginated snapshot history                                                  |
| GET `/api/v1/execution/overview`     | snapshotId                                    | Lifecycle, hash, counts and bounded diagnostic preview                      |
| GET `/api/v1/execution/functions`    | snapshotId; page, search                      | Function browser                                                            |
| GET `/api/v1/execution/calls`        | snapshotId; page, search                      | Call and callback-reference records                                         |
| GET `/api/v1/execution/entries`      | snapshotId; page, search                      | Potential framework/export entry points                                     |
| GET `/api/v1/execution/unresolved`   | snapshotId; page, search                      | Unresolved targets with evidence and reasons                                |
| GET `/api/v1/execution/function`     | snapshotId, functionId                        | Function metadata, calls, control graph and local value graph               |
| GET `/api/v1/execution/control-flow` | snapshotId, functionId                        | Bounded function inspector including control transitions                    |
| GET `/api/v1/execution/data-flow`    | snapshotId, functionId; scope=intraprocedural | Bounded local value graph; unsupported interprocedural scope is rejected    |
| GET `/api/v1/execution/neighborhood` | snapshotId, functionId; depth 1–3             | Bounded incoming/outgoing function neighborhood                             |
| GET `/api/v1/execution/paths`        | snapshotId, functionId, targetId; depth 1–12  | Potential invocation paths and referenced function metadata                 |

GET inputs are query parameters; POST inputs are strict JSON with an 8 KiB body limit. Workspace/job/snapshot IDs are UUIDs; source object IDs are bounded strings. See [analysis limits](supported-analysis.md) for page and traversal limits.

Expected failures include 400 invalid inputs/options, 401 missing session, 403 rejected mutation origin/header, 404 missing/inaccessible resources, 409 incomplete snapshot and 429 more than five extraction requests per workspace per minute. Concurrent requests share a transaction-scoped advisory lock so the rate limit cannot be raced.

Historical snapshots remain artifacts of their workspace after a repository disconnect. Current members can read them, but new extraction is denied and an in-flight extraction cannot publish after revocation. Removing membership or deleting the workspace denies historical reads too. Function and path endpoints validate that requested symbols belong to the same accessible snapshot.
