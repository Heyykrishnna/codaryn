# Phase 2: GitHub connection and repository management

**Objective:** Allow users to securely connect and manage repositories.

### Frontend

- GitHub connection screen.
- Installation status.
- Repository grid.
- Repository table.
- Search and filters.
- Public/private badges.
- Branch selector.
- Commit selector.
- Repository settings.
- Disconnect integration flow.

### Backend

- GitHub App integration.
- Installation token handling.
- Repository listing.
- Branch retrieval.
- Commit retrieval.
- Permission validation.
- Webhook endpoint.
- Repository synchronization.
- Rate-limit handling.

### Ingestion worker

- Retrieve selected commit.
- Validate repository archive.
- Extract source into temporary workspace.
- Apply ignore rules.
- Build file inventory.
- Calculate content hashes.
- Detect monorepo boundaries.

### Security requirements

- No permanent raw GitHub installation tokens.
- No arbitrary repository scripts.
- No dependency lifecycle execution.
- Isolated ingestion storage.
- Cleanup after processing.

**Acceptance criteria**

- User can connect GitHub.
- Private repositories work with authorized access.
- User can choose a branch and commit.
- Repository ingestion returns a verified commit SHA.
- Repository contents are not exposed across workspaces.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Phases 0–1 for identity, authorization and storage.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
