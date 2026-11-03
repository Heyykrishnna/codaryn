# Phase 12: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P12-AT01 | **Incremental equivalence:** Modify, add and delete files in a fixture, then compare incremental output with a full run. | Normalized supported graph and diagnostics agree; discrepancies trigger a safe full analysis. |
| P12-AT02 | **Invalidation:** Change a dependency, configuration and analyzer version independently. | Affected results are invalidated and only compatible unchanged results are reused. |
| P12-AT03 | **Webhook scheduling:** Deliver a valid configured event, a duplicate and an invalid signature. | The valid event schedules the intended commit once logically; invalid events are rejected. |
| P12-AT04 | **History and impact:** Compare snapshots and inspect impact after a change. | Historical snapshots remain immutable and changes and affected modules are traceable to evidence. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
