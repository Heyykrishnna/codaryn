# Phase 13 API

All routes require a session. Existing workspace membership errors are intentionally nondisclosing. All team POST bodies are strict objects limited to 8 KiB, with the existing origin/custom-header CSRF protection. Workspace, resource and grant IDs use UUID validation; pages are 1–1000, 50 rows per page. Errors follow the existing structured API format.

## Team reads

`GET /api/v1/team/:action?workspaceId=<uuid>` supports:

| Action              | Result                                                                      |
| ------------------- | --------------------------------------------------------------------------- |
| `overview`          | Actor, current role/capabilities/controls and aggregate counts              |
| `members`           | Paginated member IDs and roles                                              |
| `activity`          | Workspace events for administrators, own events for members                 |
| `usage`             | Up to 90 days of daily collaboration counters                               |
| `catalog`           | `kind=versions                                                              | views | exports | presets`, paginated metadata |
| `shares`            | Issuer/recipient records; administrators see workspace records              |
| `retention-preview` | Current revision, candidate IDs/kinds and preview hash; administrators only |

## Team mutations

`POST /api/v1/team/:action` accepts:

| Action            | Fields                                                                                         | Behavior                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `settings`        | workspaceId, revision, retentionDays, retentionEnabled, allowMemberSharing, allowMemberExports | Administrator, recent session, revision conflict protection                          |
| `share`           | workspaceId, kind (`version` or `diagram`), resourceId, recipientId, hours (1–168; default 24) | Returns one-time token-bearing relative URL and expiry                               |
| `shared`          | token (43 base64url characters)                                                                | Returns source-free projection to its authorized issuer/recipient                    |
| `share-revoke`    | workspaceId, id                                                                                | Issuer or administrator revokes                                                      |
| `grant`           | workspaceId, exportId                                                                          | Returns personal five-minute download URL                                            |
| `redeem`          | id, signature (64 lowercase hexadecimal characters)                                            | Single-use attachment response after current authorization                           |
| `grant-revoke`    | workspaceId, id                                                                                | Issuer or administrator revokes                                                      |
| `retention-apply` | workspaceId, revision, hash                                                                    | Administrator, recent session; recomputes eligible candidates and deletes atomically |

URLs use `/shared#token` and `/downloads#id.signature`. Resolve relative URLs against the web application origin. Do not place fragments in server query strings, logs or analytics. These are authenticated workspace links, not public bearer links.

Existing member mutations use `/api/v1/workspace/*`; preset editing uses `/api/v1/studio/*`; diagram layouts use existing diagram routes. Export scheduling stays `POST /api/v1/workspaces/:workspaceId/analysis/:jobId/exports` with matching body jobId, exportType, format, targetId and optional layoutId. A mismatched job fails instead of changing scope. Poll the existing export status route; completed artifacts can receive signed grants.

Typical errors: unauthenticated 401; missing CSRF/role/control or stale session 403; inaccessible/revoked/expired/consumed resource 404; stale settings/retention 409; collaboration write limit 429. Client capabilities only shape UI; server checks are authoritative.
