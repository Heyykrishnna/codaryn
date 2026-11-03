# Phase 10: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P10-AT01 | **Infrastructure extraction:** Analyze Dockerfile, Compose and GitHub Actions fixtures. | Supported resources and workflow dependencies match configuration evidence. |
| P10-AT02 | **Test relationships:** Analyze Vitest and Jest fixtures and ingest a coverage report. | Supported test-to-symbol links and coverage provenance are displayed accurately. |
| P10-AT03 | **Security findings:** Run supported rules against positive, negative and unsupported cases. | Findings have evidence and limitations; sensitive matched values are redacted. |
| P10-AT04 | **Dependency provenance:** Compare vulnerability results for a declared range and a resolved lockfile version. | Results clearly distinguish declared from resolved versions and report unavailable scanner data. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
