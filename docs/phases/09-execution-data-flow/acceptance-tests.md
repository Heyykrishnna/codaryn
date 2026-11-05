# Phase 9: acceptance test plan

**Status:** Implemented with automated evidence in [verification](verification.md); visual release checks are recorded separately in the PR. Scope and original acceptance criteria: [phase overview](README.md).

Maintain these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID       | Scenario and action                                                                                            | Expected result                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P09-AT01 | **Calls and paths:** Analyze direct calls, methods, constructors and callbacks in controlled fixtures.         | Resolved calls link to the correct symbol and source evidence.                                          |
| P09-AT02 | **Control flow:** Inspect branches, loops and return paths.                                                    | The viewer represents supported potential paths without presenting them as guaranteed runtime behavior. |
| P09-AT03 | **Unresolved calls:** Analyze dynamic dispatch and unsupported callback patterns.                              | Unresolved calls are visible and no unsupported target is asserted.                                     |
| P09-AT04 | **Data flow bounds:** Trace a supported intraprocedural value and request an unsupported interprocedural path. | Supported flow is evidenced and analysis boundaries are disclosed.                                      |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
