# Phase 1: Authentication and workspace management

**Objective:** Build the actual user and organization system.

### Frontend

- Sign-in page.
- GitHub sign-in.
- Account profile.
- Workspace creation.
- Workspace switching.
- Member management.
- Role management.
- Workspace settings.

### Backend

- User management.
- Session management.
- Organization CRUD.
- Organization membership.
- Role-based authorization.
- Workspace-scoped database queries.
- Audit event generation.

### Security

- Secure session handling.
- CSRF protection where applicable.
- Token storage encryption.
- Login rate limiting.
- Workspace access verification.

**Acceptance criteria**

- Users can create workspaces.
- Users can join or leave authorized workspaces.
- Roles are enforced by the API.
- One organization cannot access another organization's repositories.
- Workspace changes are auditable.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Phase 0 contracts, persistence and API foundation.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
