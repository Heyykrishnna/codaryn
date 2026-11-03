# Phase 3 architecture

## Boundaries

The `/studio` client route uses the existing Better Auth session and workspace list. It remounts studio state when the workspace changes, preventing one workspace's draft, profile and manifest history from appearing in another workspace. Repository, branch and commit selectors use the Phase 2 API and its pagination. Commit submission is limited to a full SHA in the UI; the API independently resolves the supplied ref through GitHub and persists the immutable SHA.

`packages/contracts/src/studio.ts` owns the registry, configuration version 1, preset definitions, compatibility rules, response schemas and canonical normalization. It contains no Node-only imports and can run in the browser. The server independently invokes the same normalization at every write boundary; browser validation is only feedback.

`apps/api/src/studio` separates HTTP dispatch, workspace persistence and manifest hashing. The existing session/origin guard protects all studio routes. `StudioService` holds membership and workspace locks during database operations and checks installation generation again after GitHub resolution. No repository scripts, configurations or dependencies are executed.

## Analyzer registry

Registry version `1.0.0` declares inventory, TypeScript, React, API, schema, infrastructure, testing and security modules. Every descriptor includes ID, version, file types, framework prerequisites, dependencies, a resource category and an empty-object configuration schema. Unknown analyzer options cannot enter the strict configuration contract. These are scheduling declarations for later analyzer implementations; Phase 3 does not claim to execute those analyzers. Framework applicability must be checked against source by the later execution engine.

Dependency closure adds inventory and all transitive requirements. Schema outputs require schema analysis; API reference requires API analysis; security report requires security and infrastructure analysis. Data-flow diagrams require deep depth, and the testing analyzer requires test files. Invalid combinations produce actionable server errors. The preview shows automatically included modules.

## Canonical manifests

Normalization produces an object in a fixed key order, deduplicates and sorts module/output IDs and exclusion globs, and resolves dependencies. A manifest includes format version, registry version, repository ID, verified commit SHA, normalized configuration and selected analyzer versions. SHA-256 hashes its canonical JSON. Workspace ID, actor, request ID, timestamps, branch labels and profile display names are deliberately outside the hash; they do not change the work represented by an immutable repository snapshot.

Equivalent requests produce identical manifest content/hash but separate durable request IDs and audit records. A changed commit, configuration or analyzer version changes the hash. Editing or deleting a profile cannot change an existing manifest. Status is `configured`; it does not indicate queued, running or completed execution. Later phases must explicitly add an execution lifecycle rather than interpreting a configured manifest as a completed analysis.

## Persistence and concurrency

Migration `0005_analysis_studio.sql` adds `analysis_profiles`, `analysis_profile_versions` and `analysis_manifests`, with workspace/user/repository foreign keys, positive revisions, hash/status constraints and workspace/time indexes. Existing migrations remain unchanged. Matching Drizzle declarations participate in `db:verify`.

Profiles use optimistic revisions. Each successful create/update writes an immutable configuration revision and audit event in the same transaction. A stale revision returns 409. Duplication creates a new profile ID with revision 1. Deleting a profile removes its version history; manifests remain independent. Workspace owners/admins manage profiles; all current members can read profiles, validate configuration, create manifests and read manifest history.

Workspace advisory locks serialize profile writes and manifest creation. Membership/workspace shared locks prevent revocation/deletion races during persistence. Manifest creation rechecks the connected repository, workspace ownership and installation generation after upstream resolution. No user-controlled SQL fragments or raw source are persisted.

## Limits

- 64 KiB studio request body, strict configuration fields, at most 32 input analyzer IDs.
- 100 exclusion globs, each at most 200 characters; absolute paths, backslashes, control characters and traversal are rejected.
- 100 profiles per workspace, profile names from 1 to 100 trimmed characters.
- 50 profiles/manifests per API page, bounded page numbers. The UI displays the 50 most recent manifests.
- 30 newly persisted manifests per workspace per minute; rejected writes return 429.
- GitHub requests retain Phase 2 timeouts, limits and authorization checks.

The old three-field configuration validation endpoint remains available for Phase 0 API compatibility. New studio functionality uses authenticated `/api/v1/studio/*` endpoints exclusively.
