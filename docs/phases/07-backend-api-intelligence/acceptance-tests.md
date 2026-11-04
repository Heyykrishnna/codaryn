# Phase 7: acceptance test plan

**Status:** Executed and passing. All acceptance scenarios have been implemented and verified. Scope and original acceptance criteria: [phase overview](README.md).

| ID | Scenario and action | Expected result | Actual result | Status |
|---|---|---|---|---|
| P07-AT01 | **Framework routes:** Analyze Express, NestJS and Fastify fixtures including mounted routes. | Supported methods, paths and handlers match the source and expose evidence. | Successfully extracted Express `router.get`/`post`, Fastify plugin routes, and NestJS `@Controller` / `@Get` / `@Post` with paths, handlers, and source lines. | Pass |
| P07-AT02 | **Middleware sequence:** Analyze statically ordered middleware and dynamically assembled routing. | Known ordering is preserved and dynamic or unsupported portions are marked unresolved. | Extracted ordered middleware chains across router.use and route arguments. Dynamic routing parameters flagged as `isDynamic: true`. | Pass |
| P07-AT03 | **Request relationships:** Trace a route through a controller, service and repository. | Each displayed connection is supported by evidence and scoped to the snapshot. | Reconstructed full call flows: route -> middleware -> controller -> service -> repository with ORM classification and file provenance. | Pass |
| P07-AT04 | **Authorization evidence:** Inspect recognized validation and authentication patterns plus an unsupported pattern. | Detection is shown as evidence, not a claim that an endpoint is secure. | Identified Zod, Joi, class-validator, Fastify schema, AuthGuard, passport, JWT patterns, categorized and linked with source evidence. | Pass |

## Cross-cutting checks

- Verified loading, empty, and error states across the Backend Explorer UI (`apps/web/src/features/backend-explorer/`).
- Verified server-side tenant authorization and workspace isolation (`apps/api/src/backend/backend.integration.test.ts`).
- Tested boundary conditions, unresolved references, dynamic route parameters, and unknown ORM handlers.
- Passed full test suite: unit tests, integration tests, lint checks, type checks, and production build.

## Completion evidence

- **Contracts:** `packages/contracts/src/backend.ts` and test suite (`backend.test.ts`).
- **AST Extractor Engine:** `packages/backend-analyzer/` with 31/31 passing unit tests.
- **Database Schema:** `packages/database/migrations/0009_backend_intelligence.sql` applied to Neon PostgreSQL.
- **Worker Pipeline:** `workers/analysis/src/processor.ts` `backend` stage tested and verified.
- **API Endpoints:** `apps/api/src/backend/` verified with integration tests.
- **Web UI:** `apps/web/app/backend/page.tsx` and feature components built cleanly with Next.js Turbopack.
- **Fixtures:** `fixtures/repositories/backend-app/` covering Express, Fastify, NestJS, Drizzle, and Prisma.
