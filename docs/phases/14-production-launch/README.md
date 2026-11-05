# Phase 14: Performance, security and production launch

**Status:** Implementation and controlled release qualification delivered. This phase does not itself deploy a public production environment or authorize starting live workers. Recorded outcomes and remaining launch gates are in [verification](verification.md).

## Delivered scope

- Server-enforced workspace and repository access on legacy graph, frontend and backend routes; compiler filesystem isolation; safe error responses.
- Bounded progressive graph pages, debounced server search, cancelable reads, bounded SVG rendering, keyboard selection and responsive workspace navigation.
- Account-scoped UI state, application/global error recovery, anonymous Core Web Vitals/error counters and a downloadable public offline guide.
- Shared PostgreSQL request budgets, body/statement limits, bounded queue admission, liveness/readiness probes and token-protected instance metrics.
- A real analysis archive consumer replacing the production foundation smoke entry point, fenced claims, bounded attempts, atomic publication, per-job artifact IDs and process-death recovery tests.
- Disposable backup restoration, real HTTP load tests, golden parser/symbol/graph/incremental fixtures, RSS profiling and index-plan qualification.
- Nonroot API/web/analysis images, production Compose template, seven worker image gates and a separate CI backup-restore job. No live workers were started during qualification.

## Acceptance mapping

| Original requirement                           | Implementation and evidence                                                                                                                       |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| No cross-workspace access                      | Current-session guards plus existing isolation suites and real release HTTP/database fixtures                                                     |
| No ordinary repository script execution        | Virtual compiler host restricts host fallback; malicious package script/plugin and archive fixtures; isolated no-network container benchmark      |
| Responsive progressive graph navigation        | 200-node/400-edge limits, stable pages, debounced search, bounded neighborhoods and 10,000-node render/load fixtures                              |
| Recovery from worker failure                   | Child worker killed after claiming; expired lease reclaimed once; real artifacts published atomically with current authorization                  |
| Full recovery from incremental inconsistencies | Existing poisoned-cache fallback suite and large golden full/incremental equivalence fixture                                                      |
| Tested backup restoration                      | Custom-format dump restored into a fresh disposable database; migration checksums, auth tables and representative row/hash integrity verified     |
| Security review completed                      | [Internal review](security-review.md) records findings, fixes, residual risks and operational ownership; independent certification is not claimed |

[Architecture and budgets](architecture.md) · [Operations](operations.md) · [API](api.md) · [Security review](security-review.md) · [Supported boundaries](supported-analysis.md) · [Acceptance tests](acceptance-tests.md) · [Verification](verification.md)

Dependencies: all release-scoped prior phases. [All phases](../README.md) · [Product specification](../../product-specification.md)
