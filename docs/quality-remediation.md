# SonarCloud remediation record

Baseline: analysis of commit `657aa41600e7f62ccfceb25f031fb33753b921e4`, with 52 open findings. Source fixes do not mark issues accepted or disable rules. SonarCloud must analyze the updated commit to confirm its ratings and quality gate.

| Reported finding     | Rule                | Source                                                         | Remediation                                         |
| -------------------- | ------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| AaGi2BkXK1ENCXpITbRC | typescript:S7503    | `apps/api/src/repositories/routes.ts`                          | Synchronous registration or explicit Promise return |
| AaGi2BkXK1ENCXpITbRD | typescript:S7503    | `apps/api/src/repositories/routes.ts`                          | Synchronous registration or explicit Promise return |
| AaGi2BkXK1ENCXpITbRE | typescript:S3776    | `apps/api/src/repositories/routes.ts`                          | Focused route actions and archive helpers           |
| AaGi2BkaK1ENCXpITbRF | typescript:S9382    | `apps/api/src/repositories/service.ts`                         | Batch operations or ordered migration reduction     |
| AaGi2BkdK1ENCXpITbRG | typescript:S9382    | `apps/api/src/repositories/webhook.ts`                         | Batch operations or ordered migration reduction     |
| AaGi2BkUK1ENCXpITbRB | typescript:S7781    | `apps/api/src/server.ts`                                       | Literal replaceAll                                  |
| AaGi2BkBK1ENCXpITbQ0 | typescript:S6819    | `apps/web/app/repositories/page.tsx`                           | Native output semantics                             |
| AaGi2BkBK1ENCXpITbQ1 | typescript:S6772    | `apps/web/app/repositories/page.tsx`                           | Explicit label text elements                        |
| AaGi2BkBK1ENCXpITbQ2 | typescript:S9011    | `apps/web/app/repositories/page.tsx`                           | Explicit submit/button behavior                     |
| AaGi2BkBK1ENCXpITbQ3 | typescript:S3735    | `apps/web/app/repositories/page.tsx`                           | Handled event operations without void               |
| AaGi2BkBK1ENCXpITbQ4 | typescript:S3735    | `apps/web/app/repositories/page.tsx`                           | Handled event operations without void               |
| AaGi2BkBK1ENCXpITbQ5 | typescript:S6819    | `apps/web/app/repositories/page.tsx`                           | Native output semantics                             |
| AaGi2BkNK1ENCXpITbQ- | typescript:S4624    | `apps/web/src/features/repositories/api.ts`                    | Independent query-string construction               |
| AaGi2BkNK1ENCXpITbQ_ | typescript:S3358    | `apps/web/src/features/repositories/api.ts`                    | Independent decisions without nested ternaries      |
| AaGi2BkNK1ENCXpITbRA | typescript:S3358    | `apps/web/src/features/repositories/api.ts`                    | Independent decisions without nested ternaries      |
| AaGi2BkKK1ENCXpITbQ6 | typescript:S6759    | `apps/web/src/features/repositories/details.tsx`               | Read-only component props                           |
| AaGi2BkKK1ENCXpITbQ7 | typescript:S6772    | `apps/web/src/features/repositories/details.tsx`               | Explicit label text elements                        |
| AaGi2BkKK1ENCXpITbQ8 | typescript:S6772    | `apps/web/src/features/repositories/details.tsx`               | Explicit label text elements                        |
| AaGi2BkKK1ENCXpITbQ9 | typescript:S6772    | `apps/web/src/features/repositories/details.tsx`               | Explicit label text elements                        |
| AaGi2BikK1ENCXpITbQu | typescript:S3358    | `packages/github/src/index.ts`                                 | Independent decisions without nested ternaries      |
| AaGi2BikK1ENCXpITbQv | typescript:S3358    | `packages/github/src/index.ts`                                 | Independent decisions without nested ternaries      |
| AaGi2Bj7K1ENCXpITbQw | typescript:S3776    | `packages/repository-ingestion/src/index.ts`                   | Focused route actions and archive helpers           |
| AaGi2Bj7K1ENCXpITbQx | typescript:S9382    | `packages/repository-ingestion/src/index.ts`                   | Batch operations or ordered migration reduction     |
| AaGi2Bj7K1ENCXpITbQy | typescript:S9382    | `packages/repository-ingestion/src/index.ts`                   | Batch operations or ordered migration reduction     |
| AaGi2Bj7K1ENCXpITbQz | typescript:S3358    | `packages/repository-ingestion/src/index.ts`                   | Independent decisions without nested ternaries      |
| AaGi2BklK1ENCXpITbRH | typescript:S7781    | `workers/ingestion/src/index.ts`                               | Literal replaceAll                                  |
| AaGi2BklK1ENCXpITbRI | typescript:S9382    | `workers/ingestion/src/index.ts`                               | Batch operations or ordered migration reduction     |
| AaGiwuexKtp9H_NPFY5B | typescript:S7503    | `apps/api/src/identity/routes.ts`                              | Synchronous registration or explicit Promise return |
| AaGiwuexKtp9H_NPFY5C | typescript:S3776    | `apps/api/src/identity/routes.ts`                              | Focused route actions and archive helpers           |
| AaGiwuemKtp9H_NPFY43 | typescript:S3358    | `apps/web/app/workspace/page.tsx`                              | Independent decisions without nested ternaries      |
| AaGiwuemKtp9H_NPFY44 | typescript:S6819    | `apps/web/app/workspace/page.tsx`                              | Native output semantics                             |
| AaGiwuemKtp9H_NPFY45 | typescript:S6772    | `apps/web/app/workspace/page.tsx`                              | Explicit label text elements                        |
| AaGiwuemKtp9H_NPFY46 | typescript:S9011    | `apps/web/app/workspace/page.tsx`                              | Explicit submit/button behavior                     |
| AaGiwuemKtp9H_NPFY47 | typescript:S9011    | `apps/web/app/workspace/page.tsx`                              | Explicit submit/button behavior                     |
| AaGiwuemKtp9H_NPFY48 | typescript:S6772    | `apps/web/app/workspace/page.tsx`                              | Explicit label text elements                        |
| AaGiwuemKtp9H_NPFY49 | typescript:S9011    | `apps/web/app/workspace/page.tsx`                              | Explicit submit/button behavior                     |
| AaGiwuemKtp9H_NPFY4- | typescript:S9011    | `apps/web/app/workspace/page.tsx`                              | Explicit submit/button behavior                     |
| AaGiwuemKtp9H_NPFY4_ | typescript:S6479    | `apps/web/app/workspace/page.tsx`                              | Stable persisted audit event IDs                    |
| AaGiwuesKtp9H_NPFY5A | typescript:S7503    | `apps/web/next.config.ts`                                      | Synchronous registration or explicit Promise return |
| AaGiwudGKtp9H_NPFY4z | typescript:S9382    | `packages/database/src/migrate.ts`                             | Batch operations or ordered migration reduction     |
| AaGiwudGKtp9H_NPFY40 | typescript:S9382    | `packages/database/src/migrate.ts`                             | Batch operations or ordered migration reduction     |
| AaGiwudGKtp9H_NPFY41 | typescript:S9382    | `packages/database/src/migrate.ts`                             | Batch operations or ordered migration reduction     |
| AaGiwudGKtp9H_NPFY42 | typescript:S9382    | `packages/database/src/migrate.ts`                             | Batch operations or ordered migration reduction     |
| AaGirVuK5Jm_DsC5Kku1 | typescript:S7503    | `apps/api/src/app.ts`                                          | Synchronous registration or explicit Promise return |
| AaGirVuG5Jm_DsC5Kkuz | typescript:S6772    | `apps/web/src/features/analysis-studio/configuration-form.tsx` | Explicit label text elements                        |
| AaGirVuG5Jm_DsC5Kku0 | typescript:S9011    | `apps/web/src/features/analysis-studio/configuration-form.tsx` | Explicit submit/button behavior                     |
| AaGipI7BrzDJfBdYQeKp | githubactions:S7637 | `.github/workflows/ci.yml`                                     | Verified immutable action commit pins               |
| AaGipI6zrzDJfBdYQeKm | typescript:S7503    | `apps/api/src/app.ts`                                          | Synchronous registration or explicit Promise return |
| AaGipI5RrzDJfBdYQeKl | typescript:S6819    | `apps/web/app/page.tsx`                                        | Native output semantics                             |
| AaGirVsz5Jm_DsC5Kkuy | typescript:S6819    | `apps/web/app/page.tsx`                                        | Native output semantics                             |
| AaGipI67rzDJfBdYQeKn | shell:S1066         | `skills-agents-all/skills/wizard/template.sh`                  | Short-circuit shell guards                          |
| AaGipI67rzDJfBdYQeKo | shell:S1066         | `skills-agents-all/skills/wizard/template.sh`                  | Short-circuit shell guards                          |

All original source locations were reviewed. Local SonarJS/TypeScript checks cover cognitive complexity, nested expressions and async behavior; these are supplemental and do not replace a cloud analysis. Project formatting, lint, types, builds and regression tests remain required.

The Neon migration is documented separately in [database operations](database.md). Credentials are excluded from source control and build contexts.

## Follow-up analysis

SonarCloud analyzed commit `134ad4a12a09a038be6f12629af532ce1216276f` and reported Security A, Maintainability A, zero duplicated new lines and 100% reviewed security hotspots. The original 52 findings were no longer open. Reliability remained C because 18 UI callbacks now exposed floating promises. The 22 follow-up findings below are addressed in the working source; another cloud analysis is required to verify the resulting gate.

UI callbacks now await their operation runner, which handles failures and restores the busy state. Literal private-key newline matching uses `String.raw`, and worker database imports are consolidated.

| Finding              | Rule             | Source                                           | Remediation                                 |
| -------------------- | ---------------- | ------------------------------------------------ | ------------------------------------------- |
| AaGi8Qsx9E8XQ8rsjwSQ | typescript:S7780 | `apps/api/src/server.ts`                         | Use String.raw for literal escaped newline  |
| AaGi8QuD9E8XQ8rsjwSR | typescript:S9383 | `apps/web/app/repositories/page.tsx`             | Await the operation in an async UI callback |
| AaGi8QuD9E8XQ8rsjwSS | typescript:S9383 | `apps/web/app/repositories/page.tsx`             | Await the operation in an async UI callback |
| AaGi8QuD9E8XQ8rsjwST | typescript:S9383 | `apps/web/app/repositories/page.tsx`             | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSU | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSV | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSW | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSX | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSY | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSZ | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSa | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSb | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSc | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuI9E8XQ8rsjwSd | typescript:S9383 | `apps/web/app/workspace/page.tsx`                | Await the operation in an async UI callback |
| AaGi8QuO9E8XQ8rsjwSe | typescript:S9383 | `apps/web/src/features/repositories/details.tsx` | Await the operation in an async UI callback |
| AaGi8QuO9E8XQ8rsjwSf | typescript:S9383 | `apps/web/src/features/repositories/details.tsx` | Await the operation in an async UI callback |
| AaGi8QuO9E8XQ8rsjwSg | typescript:S9383 | `apps/web/src/features/repositories/details.tsx` | Await the operation in an async UI callback |
| AaGi8QuO9E8XQ8rsjwSh | typescript:S9383 | `apps/web/src/features/repositories/details.tsx` | Await the operation in an async UI callback |
| AaGi8QuO9E8XQ8rsjwSi | typescript:S9383 | `apps/web/src/features/repositories/details.tsx` | Await the operation in an async UI callback |
| AaGi8QuX9E8XQ8rsjwSk | typescript:S3863 | `workers/analysis/src/index.ts`                  | Consolidate database imports                |
| AaGi8QuT9E8XQ8rsjwSj | typescript:S7780 | `workers/ingestion/src/index.ts`                 | Use String.raw for literal escaped newline  |
| AaGi8QuX9E8XQ8rsjwSl | typescript:S3863 | `workers/analysis/src/index.ts`                  | Consolidate database imports                |
