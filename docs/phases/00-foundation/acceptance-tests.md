# Phase 0: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P00-AT01 | **Foundation build:** Install with the chosen reproducible lockfile and build every application and shared contract. | All builds and type checks complete successfully in a clean environment. |
| P00-AT02 | **Contract exchange:** Send valid and invalid requests between the web application and API. | Valid payloads round-trip through shared validation; invalid payloads receive a consistent error. |
| P00-AT03 | **Persistence and queue:** Apply migrations to an empty database, enqueue a sample task and restart the worker. | Migrations succeed, the task is processed once logically and its result is persisted. |
| P00-AT04 | **Failure states:** Make the API and queue unavailable independently. | The interface and services expose actionable failures without leaking secrets. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
