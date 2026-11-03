# Phase 11: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P11-AT01 | **Snapshot consistency:** Generate each supported diagram and document from a selected analysis. | All outputs use that snapshot and include commit and analyzer metadata. |
| P11-AT02 | **Evidence and uncertainty:** Inspect a confirmed claim and an inferred or unresolved relationship. | Confirmed claims link to evidence and uncertain relationships are labeled. |
| P11-AT03 | **Export and layout:** Save a layout, reload it and export supported formats. | The layout persists and exported artifacts represent the selected snapshot and view. |
| P11-AT04 | **Access and failure:** Attempt an unauthorized export and simulate an export job failure. | Access is denied across tenants and failures are reported without a misleading completed artifact. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
