# Phase 7: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P07-AT01 | **Framework routes:** Analyze Express, NestJS and Fastify fixtures including mounted routes. | Supported methods, paths and handlers match the source and expose evidence. |
| P07-AT02 | **Middleware sequence:** Analyze statically ordered middleware and dynamically assembled routing. | Known ordering is preserved and dynamic or unsupported portions are marked unresolved. |
| P07-AT03 | **Request relationships:** Trace a route through a controller, service and repository. | Each displayed connection is supported by evidence and scoped to the snapshot. |
| P07-AT04 | **Authorization evidence:** Inspect recognized validation and authentication patterns plus an unsupported pattern. | Detection is shown as evidence, not a claim that an endpoint is secure. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
