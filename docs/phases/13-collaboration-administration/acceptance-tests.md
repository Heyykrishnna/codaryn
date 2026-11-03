# Phase 13: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P13-AT01 | **Role and sharing:** Create and open shared views as permitted and forbidden users. | Every request is checked server-side and unauthorized users cannot view private source. |
| P13-AT02 | **Export lifecycle:** Generate an export for a snapshot, use its signed link and try after expiry or permission revocation. | The artifact is scoped correctly and access follows the documented expiry and revocation policy. |
| P13-AT03 | **Administration:** Change membership, role, preset and retention settings. | Authorized changes persist and relevant events are auditable without sensitive payloads. |
| P13-AT04 | **Retention:** Apply a retention policy to eligible snapshots and artifacts. | Eligible data is removed according to policy while protected data remains accessible. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
