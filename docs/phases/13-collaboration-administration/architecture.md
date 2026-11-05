# Phase 13 architecture and security

## Modules and trust boundaries

`packages/contracts/src/team.ts` defines controls, capabilities, projections and frozen artifacts. `apps/api/src/team` separates transactional workspace access, administration, sharing, downloads, retention and HTTP validation. `apps/web/src/features/team` renders the dashboard and authenticated link portals. Existing workspace, Studio and diagram services retain their responsibilities.

`TeamStore` checks current membership and a nondeleted workspace inside each transaction, locks authorization rows, reads current controls and serializes collaboration writes using a workspace advisory lock. Requests are session authenticated. Mutations require the existing allowed origin and custom CSRF header. Controls and retention application require a session created within one hour. Changes use optimistic revisions; stale previews/settings fail with conflict rather than overwriting newer decisions.

| Capability                                    | Owner                          | Admin     | Member                           |
| --------------------------------------------- | ------------------------------ | --------- | -------------------------------- |
| View workspace dashboard/inventory            | Yes                            | Yes       | Yes                              |
| Change existing member roles/remove members   | Yes, existing owner protection | No        | No                               |
| Manage presets, workspace controls, retention | Yes                            | Yes       | No                               |
| Create architecture shares                    | Yes                            | Yes       | Only if enabled                  |
| Request exports/create download grants        | Yes                            | Yes       | Enabled by default, configurable |
| Read audit timeline                           | Workspace                      | Workspace | Own events                       |
| Revoke a share/grant                          | Workspace                      | Workspace | Own resources                    |

Existing invitation rules allow admins to invite members through workspace management. Roles are not accepted from client-provided capability flags.

## Sharing

A random 256-bit token is returned once in the URL fragment. Only its SHA-256 digest is stored. A share names a single existing recipient; possession of a link alone grants nothing. Creation and opening verify workspace participants, active repository, connected installation, generation and uncancelled job. Disabling member sharing invalidates shares created by a member. Revocation/expiry takes effect on subsequent requests; already downloaded information cannot be recalled.

Versions project file identities and dependency links. Saved diagrams project diagram nodes and edges. Projection bounds are 200 nodes and 500 edges, with explicit truncation and removal of dangling edges. Raw source, schema defaults and arbitrary snapshot properties are excluded. The portal renders typed labels with React escaping; it never injects supplied markup. Token fragments are submitted only after an explicit user action. Responses use existing private cache/security headers; downloads additionally use attachment, no-referrer and nosniff headers.

## Immutable exports and grants

Scheduling resolves the requested job/layout, validates domain snapshots and creates the render artifact within the request transaction. The binding includes job ID, commit SHA, format, filename, MIME type, UTF-8 size and SHA-256. The worker claims a fenced lease and checks the binding before publication. It verifies current actor membership, member export policy, active repository and installation before inserting artifact bytes and completing the lease atomically. Corrupt bindings and legacy queued jobs without a binding fail safely. Completed legacy artifacts remain compatible.

Signed grants use a domain-separated HMAC of grant ID, actor, export ID, artifact hash and expiry, using `AUTH_SECRET`. Database state adds revocation and consumption. Redemption checks current scope, constant-time MAC comparison, payload integrity and a locked grant row. Concurrent redemption yields one success. No production path renders from mutable latest snapshots in the export worker.

## Persistence and retention

Migration `0016_team_administration.sql` adds workspace controls, resource shares, export download grants, daily usage and a nullable export binding. The schema verifier recognizes PostgreSQL `date` distinctly from timestamp. No existing data is destructively migrated.

Retention is opt-in and manually invoked. It considers completed/failed schema, execution, quality and version snapshots, plus completed/failed export jobs, older than 7–3650 days. Each preview is capped at 25 per kind, 125 total. The current latest completed snapshot per repository/kind is protected; older versions referenced by baselines, comparisons or active version shares are protected; valid unused download grants protect exports. Export artifact deletion follows the existing job cascade. A hash binds the preview to candidate IDs and control revision; application recomputes eligibility under locks. It does not delete analysis jobs, saved layouts, members, audit events, presets or source archives. A saved layout alone does not pin historical domain snapshots; create a version share/baseline when persistence is required.

Audit records contain action and target identifiers, not secrets, link tokens or private source. Daily usage counts share creation/opening, grant issuance/redemption and retention deletions; this is operational activity, not billing metering.
