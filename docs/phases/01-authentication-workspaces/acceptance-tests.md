# Phase 1: acceptance test plan

**Status:** API and database scenarios have been implemented and exercised. Live provider and signed-in browser verification remain pending; see [verification record](verification.md). Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P01-AT01 | **Workspace lifecycle:** Create, switch, join and leave workspaces as authorized users. | Membership and active workspace state persist and the appropriate audit events are recorded. |
| P01-AT02 | **Role enforcement:** Attempt each privileged operation with an authorized and unauthorized role, including direct API calls. | Only permitted operations succeed; denied requests do not mutate state. |
| P01-AT03 | **Tenant isolation:** Request another organization’s repositories and settings using manipulated identifiers. | The request is denied without disclosing private data. |
| P01-AT04 | **Session security:** Exercise expired sessions, logout, login throttling and applicable CSRF protections. | Sessions are invalidated, abuse is limited and unauthorized mutations fail. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
