# Development phases

This roadmap contains phases 0–14 from the [product specification](../product-specification.md). Phases 0–2 are in progress; the remaining phases are planned. The current foundation does not satisfy Phase 0. Each folder preserves the original deliverables and acceptance criteria and provides a test plan. The scenarios are proposed verification, not evidence of execution. Phase numbers express the intended sequence; cross-domain integration may require later phases as noted in each overview.

| Phase | Scope                                                                                             | Verification                                                               | Status      |
| ----- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------- |
| 0     | [Product foundation and system contracts](00-foundation/README.md)                                | [Acceptance tests](00-foundation/acceptance-tests.md)                      | In progress |
| 1     | [Authentication and workspace management](01-authentication-workspaces/README.md)                 | [Acceptance tests](01-authentication-workspaces/acceptance-tests.md)       | In progress |
| 2     | [GitHub connection and repository management](02-github-repositories/README.md)                   | [Acceptance tests](02-github-repositories/acceptance-tests.md)             | In progress |
| 3     | [Analysis Studio and user configuration](03-analysis-studio/README.md)                            | [Acceptance tests](03-analysis-studio/acceptance-tests.md)                 | Implemented |
| 4     | [TypeScript analysis foundation](04-typescript-foundation/README.md)                              | [Acceptance tests](04-typescript-foundation/acceptance-tests.md)           | Implemented |
| 5     | [Symbol resolution and dependency graph](05-symbol-resolution-graph/README.md)                    | [Acceptance tests](05-symbol-resolution-graph/acceptance-tests.md)         | Implemented |
| 6     | [Frontend architecture intelligence](06-frontend-intelligence/README.md)                          | [Acceptance tests](06-frontend-intelligence/acceptance-tests.md)           | Implemented |
| 7     | [Backend architecture and API intelligence](07-backend-api-intelligence/README.md)                | [Acceptance tests](07-backend-api-intelligence/acceptance-tests.md)        | Implemented |
| 8     | [Schema Studio and database intelligence](08-schema-studio/README.md)                             | [Acceptance tests](08-schema-studio/acceptance-tests.md)                   | Implemented |
| 9     | [Call graphs, execution and data flow](09-execution-data-flow/README.md)                          | [Acceptance tests](09-execution-data-flow/acceptance-tests.md)             | Planned     |
| 10    | [Infrastructure, testing and security intelligence](10-infrastructure-testing-security/README.md) | [Acceptance tests](10-infrastructure-testing-security/acceptance-tests.md) | Planned     |
| 11    | [Diagram and documentation system](11-diagrams-documentation/README.md)                           | [Acceptance tests](11-diagrams-documentation/acceptance-tests.md)          | Planned     |
| 12    | [Incremental analysis, comparison and impact](12-incremental-comparison-impact/README.md)         | [Acceptance tests](12-incremental-comparison-impact/acceptance-tests.md)   | Planned     |
| 13    | [Collaboration, administration and exports](13-collaboration-administration/README.md)            | [Acceptance tests](13-collaboration-administration/acceptance-tests.md)    | Planned     |
| 14    | [Performance, security and production launch](14-production-launch/README.md)                     | [Acceptance tests](14-production-launch/acceptance-tests.md)               | Planned     |

## Shared completion gates

For every phase, meet its original acceptance criteria, run its applicable acceptance scenarios and project quality checks, and document actual results and known limitations. Cover accessibility, error and empty states, server-side authorization, tenant isolation, evidence provenance, unsupported cases and privacy wherever applicable. Test fixtures must be controlled and deterministic. Never execute analyzed repository scripts or install their dependencies during ordinary static analysis.

The source specification remains the authoritative product blueprint. Phase overviews reproduce its phase sections for practical planning; keep both aligned if product scope changes. Acceptance test plans expand verification without claiming new capabilities already exist. Release milestones and priority are documented in the specification.
