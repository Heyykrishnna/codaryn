# Phase 10: Infrastructure, testing and security intelligence

**Objective:** Understand the operational architecture around the application.

### Frontend

- Infrastructure explorer.
- Docker architecture.
- CI/CD workflow viewer.
- Environment configuration view.
- Testing explorer.
- Test-to-module relationships.
- Security dashboard.
- Finding detail inspector.

### Backend

- Infrastructure analysis APIs.
- Testing result APIs.
- Security diagnostics APIs.
- OSV result storage.
- Finding filtering and grouping.
- Audit and severity management.

### Analysis engine

Infrastructure:

- Dockerfile.
- Docker Compose.
- GitHub Actions.

Testing:

- Vitest.
- Jest.
- Test-to-symbol relationships.
- Coverage report ingestion.

Security:

- Hardcoded credential rules.
- Dangerous function patterns.
- Configuration rules.
- Semgrep integration.
- OSV Scanner integration.

### Acceptance criteria

- Infrastructure resources are extracted from configuration.
- CI/CD workflows are represented.
- Tests link to supported source symbols.
- Security findings contain evidence.
- Unsupported security cases are disclosed.
- Dependency vulnerability results distinguish declared versions from resolved lockfile versions.

**Milestone:** Operational architecture and engineering quality views.

## Planning and dependencies

**Status:** Planned; none of the acceptance criteria is claimed as complete by this document.

**Dependencies:** Phase 5 graph and evidence, plus repository ingestion and job execution.

Implement the scope above with the shared requirements in the [phase index](../README.md). Record design decisions, supported versions, migrations, operational requirements and limitations as implementation progresses. The acceptance criteria above are release obligations; the [acceptance test plan](acceptance-tests.md) turns them into executable scenarios to implement and record.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
