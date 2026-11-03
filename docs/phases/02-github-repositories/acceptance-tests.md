# Phase 2: acceptance test plan

**Status:** Automated scenarios have been implemented and exercised with real database/queue services and controlled GitHub fixtures. See the [verification record](verification.md) for evidence and live-provider limits. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P02-AT01 | **Installation access:** Connect an installation with public and private repositories, then revoke access. | Only authorized repositories appear and revoked access stops subsequent retrieval. |
| P02-AT02 | **Commit selection:** Select a branch and a specific commit and ingest each. | The recorded full SHA matches the retrieved immutable content, including after a branch moves. |
| P02-AT03 | **Hostile archive:** Ingest archives with traversal paths, unsafe links and excessive size. | Extraction is rejected or bounded, no files escape isolation and temporary data is cleaned up. |
| P02-AT04 | **GitHub failures:** Simulate expired tokens, rate limits and duplicate webhook delivery. | Errors are actionable, retries are bounded and repeated events do not duplicate work. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
