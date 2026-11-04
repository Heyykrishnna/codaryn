# Phase 7: Backend architecture and API intelligence

**Objective:** Reconstruct backend organization and request handling.

### Frontend

- Interactive Backend Explorer dashboard (`apps/web/app/backend/page.tsx`).
- API Route Inventory table & filter (`EndpointInventory.tsx`).
- Layered Architecture & Dependency Injection explorer (`ControllerServiceView.tsx`).
- Middleware & Guards pipeline visualizer (`MiddlewareChainView.tsx`).
- End-to-end request lifecycle flow traces (`RequestLifecycleView.tsx`).
- Slide-over route inspector (`EndpointDetail.tsx`).
- Filtering by HTTP method, framework, scope, kind, and search text.
- Full source evidence provenance with line numbers for all backend elements.

### Backend

- Normalized relational storage across 6 tables:
  - `analysis_backend_routes`
  - `analysis_backend_controllers`
  - `analysis_backend_services`
  - `analysis_backend_repositories`
  - `analysis_backend_middleware`
  - `analysis_backend_request_flows`
- Query endpoints with multi-tenant workspace isolation:
  - `GET /api/v1/backend/overview`
  - `GET /api/v1/backend/routes`
  - `GET /api/v1/backend/routes/:routeId`
  - `GET /api/v1/backend/controllers`
  - `GET /api/v1/backend/services`
  - `GET /api/v1/backend/repositories`
  - `GET /api/v1/backend/middleware`
  - `GET /api/v1/backend/request-flows`

### Analysis engine

- TypeScript AST extractor engine in `@codaryn/backend-analyzer`:
  - Express route adapter (`express-fastify.ts`): HTTP verbs (`get`, `post`, `put`, `delete`, `patch`), router mounting prefixes (`app.use('/prefix', router)`), inline and referenced handlers, route and router middleware.
  - Fastify route adapter (`express-fastify.ts`): route methods (`get`, `post`, etc.), plugin registration prefixes (`fastify.register(routes, { prefix })`), route options (`preHandler` hooks).
  - NestJS adapter (`nestjs.ts`): `@Controller('prefix')`, route decorators (`@Get`, `@Post`, `@Put`, `@Delete`, `@Patch`), method argument decorators (`@Param`, `@Body`, `@Query`), guard and pipe decorators (`@UseGuards`, `@UsePipes`).
  - Controller, service, and repository pattern detection (`services-repositories.ts`): class name matching, constructor dependency injection analysis, ORM classification (Drizzle, Prisma, TypeORM, Kysely, SQL).
  - Middleware detection (`services-repositories.ts`): authentication guards, schema validators, logging, CORS, rate limiting, and custom request hooks.
  - Request validation and authentication pattern extraction (`request-flow.ts`): Zod, Joi, class-validator, Fastify schemas, JWT, Bearer tokens, passport, guards, sessions.
  - Cross-layer request flow linker (`request-flow.ts`): links routes through middleware to controllers, services, and repositories based on static call graph and dependency injection evidence.
- Worker pipeline integration in `@codaryn/analysis-worker`:
  - `backend` stage executing between `frontend` and `diagnostics`.

### Acceptance criteria

- [x] Recognized routes are extracted.
- [x] HTTP methods and paths are represented.
- [x] Route handlers resolve where possible.
- [x] Middleware order is represented where statically identifiable.
- [x] Controller-to-service relationships are visible.
- [x] Unresolved dynamic routing is clearly marked.

**Milestone:** Complete initial frontend and backend views.

## Planning and dependencies

**Status:** Implemented. All acceptance criteria and verification scenarios have been executed with passing results.

**Dependencies:** Phase 5 graph and evidence; frontend cross-links depend on Phase 6.

## Key Implementation Artifacts

1. `@codaryn/contracts` (`packages/contracts/src/backend.ts`):
   - Strict Zod schemas and TypeScript types for routes, controllers, services, repositories, middleware, request flows, and query responses.
2. `@codaryn/backend-analyzer` (`packages/backend-analyzer/`):
   - AST extractors: `express-fastify.ts`, `nestjs.ts`, `services-repositories.ts`, `request-flow.ts`.
3. `@codaryn/database` (`packages/database/migrations/0009_backend_intelligence.sql`, `schema.ts`):
   - Tables and indexes for backend routes, controllers, services, repositories, middleware, and request flows.
4. `@codaryn/analysis-worker` (`workers/analysis/src/processor.ts`):
   - Dedicated `backend` stage persisting extracted models.
5. `@codaryn/api` (`apps/api/src/backend/`):
   - Query service and REST routes with tenant verification.
6. `@codaryn/web` (`apps/web/app/backend/page.tsx`, `apps/web/src/features/backend-explorer/`):
   - Interactive dashboard and slide-over inspector.
7. Fixtures (`fixtures/repositories/backend-app/`):
   - Controlled test repository with Express routers, Fastify plugins, NestJS controllers, services with DI, and Drizzle/Prisma repositories.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
