# Phase 8: acceptance test plan

**Status:** Planned; these scenarios have not been executed. Scope and original acceptance criteria: [phase overview](README.md).

Implement these scenarios at the appropriate unit, integration, end-to-end or operational layer. Use controlled fixtures with expected outputs, isolate test data, and record the command, environment, actual result and evidence for each run. A scenario passes only when its expected result is observed.

| ID | Scenario and action | Expected result |
|---|---|---|
| P08-AT01 | **Schema extraction:** Analyze Prisma, Drizzle and supported SQL DDL and migration fixtures. | Tables, fields, types, nullability, defaults, constraints, indexes and enums match golden expectations. |
| P08-AT02 | **Relations and ERD:** Inspect one-to-one, one-to-many, many-to-many, join and self-relations. | Correct keys and cardinalities appear; inferred relationships are visually distinct. |
| P08-AT03 | **Lineage and evidence:** Follow a supported path from an application field to a schema column and inspect an unresolved link. | Each connection has its proper evidence status; missing links are not fabricated. |
| P08-AT04 | **Snapshot outputs and comparison:** Export an ERD and document and compare two supported schema snapshots. | Outputs reference the selected snapshot and supported additions, removals and changes are correctly identified. |
| P08-AT05 | **Schema access:** Search and paginate objects and request another workspace’s schema. | Results are bounded and tenant authorization is enforced. |

## Cross-cutting checks

- Verify relevant loading, empty, error and permission-denied states, including keyboard access for affected UI.
- Verify server-side authorization and workspace isolation for affected resources; avoid secrets and private source in logs and errors.
- Test malformed input, boundary conditions, retries and failures appropriate to the change. Confirm evidence and uncertainty are represented accurately.
- Run the applicable lint, type checks, tests and production build; record unavailable checks and unresolved failures. Update fixtures, documentation and supported-version information.

## Completion evidence

- Implementation and review links; fixture and version identifiers.
- Test commands, environment, date, actual outcomes and any defects or limitations.
- Evidence that every original acceptance criterion in the overview is met; obtain the relevant release owners’ review before marking the phase complete.
