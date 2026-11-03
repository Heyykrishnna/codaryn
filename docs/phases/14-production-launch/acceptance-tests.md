# Phase 14: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P14-AT01 | **Isolation and execution:** Run malicious repository fixtures attempting script execution, host access and network escape. | No repository code executes and isolation controls block prohibited access. |
| P14-AT02 | **Recovery:** Terminate a worker during a job and restore a backup into a clean environment. | Jobs recover according to policy and restored data passes integrity checks. |
| P14-AT03 | **Scale and accessibility:** Exercise agreed representative large graphs, search, responsive layouts and keyboard/screen-reader flows. | Measured results meet release thresholds established before the test and critical workflows are accessible. |
| P14-AT04 | **Accuracy and operations:** Run golden fixtures, analyzer regressions, profiling, load tests and security review. | Results meet documented release thresholds, findings have owners and launch blockers are resolved. |
| P14-AT05 | **Incremental fallback:** Introduce an incremental inconsistency. | A full analysis can rebuild a correct snapshot without mutating history. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
