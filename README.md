# codaryn

Every connection, in view. codaryn is an evidence-backed architecture workspace for source repositories. It uses deterministic static analysis and no LLM.

Implemented capabilities include GitHub authentication and workspace management, repository ingestion, Analysis Studio, TypeScript/frontend/backend intelligence, Schema Studio, Execution Explorer and Engineering Quality. Analysis is static with documented boundaries; comparison, diagrams, exports and team administration are implemented; production-launch qualification remains planned. See each phase’s verification record for actual validation and optional-tool requirements.

## Start here

- [Documentation index](docs/README.md)
- [Product specification](docs/product-specification.md)
- [Development phases and acceptance criteria](docs/phases.md)
- [Architecture and boundaries](docs/architecture.md)
- [Development and validation](docs/development.md)
- [Security and privacy](docs/security.md)

The repository uses a pnpm workspace. See the development guide for setup, checks and limitations.

Architecture Comparison at `/comparisons` adds incremental module/schema versions, commit diffs and potential dependency impact. See the [Phase 12 guide](docs/phases/12-incremental-comparison-impact/README.md) for opt-in push scheduling and supported analysis limits.

Team administration at `/team` adds recipient-bound architecture sharing, signed single-use downloads, usage, audit activity and reviewed retention. See the [Phase 13 guide](docs/phases/13-collaboration-administration/README.md) for access rules and deployment requirements.
