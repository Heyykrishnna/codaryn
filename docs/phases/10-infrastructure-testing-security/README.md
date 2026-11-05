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

**Status:** Implemented with bounded static analysis and explicit optional-scanner availability. See [verification](verification.md) for executed checks and limits.

**Dependencies:** Phase 5 graph and evidence, plus repository ingestion and job execution.

The `/quality` workspace explorer combines infrastructure, test/coverage/dependency inventories, security findings and audited administrator review. A dedicated worker produces immutable commit-bound snapshots. Optional external scans default off.

- [Architecture and security boundaries](architecture.md)
- [Supported analysis and limitations](supported-analysis.md)
- [API contracts](api.md)
- [Operations and deployment](operations.md)
- [Acceptance tests](acceptance-tests.md)
- [Verification evidence](verification.md)

[Full product specification](../../product-specification.md) · [All phases](../README.md)
