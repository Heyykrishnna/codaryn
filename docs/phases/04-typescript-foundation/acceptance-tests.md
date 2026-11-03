# Phase 4: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P04-AT01 | **Language and project discovery:** Analyze fixtures containing TS, TSX, JavaScript, multiple tsconfigs and project references. | Supported files and projects are discovered and parsed with correct source locations. |
| P04-AT02 | **Partial failure:** Analyze a fixture with syntax errors and unsupported constructs. | Diagnostics and coverage identify affected files while unaffected files continue. |
| P04-AT03 | **Job lifecycle:** Start, inspect, cancel and retry an analysis with an induced worker failure. | Progress and terminal states are accurate, retries are bounded and cancellation stops further work. |
| P04-AT04 | **Symbol inventory:** Inspect functions, classes, interfaces, types, imports and exports in a fixture. | Expected symbols and locations match the fixture’s golden output. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
