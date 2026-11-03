# Phase 3: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P03-AT01 | **Wizard coverage:** Configure multiple profiles, analyzers, depth, exclusions and output options and review before submission. | The summary matches all choices and the submitted configuration. |
| P03-AT02 | **Dependencies and incompatibilities:** Select analyzers with dependencies or incompatible settings. | Required dependencies are added or explained and invalid selections are rejected by the API. |
| P03-AT03 | **Preset lifecycle:** Save, duplicate, reset and reuse a permitted preset. | Configuration is preserved correctly and workspace permissions are enforced. |
| P03-AT04 | **Manifest reproducibility:** Submit equivalent configurations in different input orders and repeat with a changed setting. | Equivalent inputs yield the same canonical manifest and hash; the changed setting is represented. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
