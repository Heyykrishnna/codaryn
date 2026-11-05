# Phase 13: Collaboration, administration and exports

**Status:** Implemented within the boundaries below. See the [verification record](verification.md) for observed results and release limitations.

The `/team` workspace dashboard combines membership, roles, inventory, architecture sharing, exports, controls, activity and usage. Existing `/workspace`, `/studio` and diagram pages remain the canonical editors for invitations, analysis presets and saved layouts.

## Delivered scope

- Organization overview with member, repository, analysis, export and storage counts.
- Paginated members; owner role changes/removals; existing membership API preserves owner protection and recent-session checks. Invitations select an existing user ID.
- Inventory of versions, saved diagram views, exports and organization presets. Preset creation uses existing Studio validation, revisions and auditing; Studio supports detailed editing.
- Recipient-bound, expiring, revocable architecture links with frozen, source-free projections and current workspace/repository authorization.
- Export requests freeze validated render output at scheduling. Workers publish only that immutable binding after rechecking current access. Five-minute signed download grants are personal and single use.
- Revision-controlled workspace sharing/export flags and manually applied retention with preview, confirmation, recent authentication and protected-resource checks.
- Scoped audit timeline and daily collaboration usage, with bounded pagination and response sizes.

## Acceptance criteria

1. Permitted users share selected architecture versions or saved diagrams with another current workspace member.
2. Roles and workspace controls are enforced at the API on every request.
3. Shared responses contain bounded graph metadata, never source bodies or schema defaults. Both participants and repository installation must remain authorized.
4. Export bytes, hash, job and commit are captured together; worker retries cannot silently render a newer snapshot.
5. Member, preset, view, control, share, download, export and retention changes have audit events without token or source payloads.
6. Retention deletes eligible historical snapshots/artifacts in a reviewed bounded batch while retaining documented references.

[Architecture](architecture.md) · [API](api.md) · [Operations](operations.md) · [Supported boundaries](supported-analysis.md) · [Acceptance tests](acceptance-tests.md) · [Verification](verification.md)

Dependencies: Phases 1, 3, 11 and 12. [All phases](../README.md) · [Product specification](../../product-specification.md)
