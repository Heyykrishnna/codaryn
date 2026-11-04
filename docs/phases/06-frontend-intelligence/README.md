# Phase 6: Frontend architecture intelligence

**Objective:** Reconstruct the supported frontend architecture.

### Frontend

- Interactive Frontend Explorer dashboard (`apps/web/app/frontend/page.tsx`).
- React component hierarchy explorer (`ComponentHierarchy.tsx`).
- Route tree and page structure inspector (`RoutesView.tsx`).
- Hooks reference and state management views (`HooksStateView.tsx`).
- Context provider and consumer matrix (`ContextsView.tsx`).
- API client call network inspector (`ApiClientsView.tsx`).
- Detailed component slide-over inspector (`ComponentDetail.tsx`).
- Search, filter by component kind, framework, hook type, state pattern, and HTTP method.
- Source line evidence provenance for all frontend elements.

### Backend

- Normalized relational storage across 7 tables:
  - `analysis_frontend_components`
  - `analysis_frontend_jsx_elements`
  - `analysis_frontend_hooks`
  - `analysis_frontend_contexts`
  - `analysis_frontend_routes`
  - `analysis_frontend_state`
  - `analysis_frontend_api_clients`
- Query endpoints with multi-tenant workspace isolation:
  - `GET /api/v1/frontend/overview`
  - `GET /api/v1/frontend/components`
  - `GET /api/v1/frontend/component`
  - `GET /api/v1/frontend/routes`
  - `GET /api/v1/frontend/hooks`
  - `GET /api/v1/frontend/contexts`
  - `GET /api/v1/frontend/state`
  - `GET /api/v1/frontend/api-clients`

### Analysis engine

- TypeScript AST extractor engine in `@codaryn/frontend-analyzer`:
  - Component detection: function declarations, arrow functions, class components, `memo()`, `forwardRef()`, `lazy()`.
  - Props extraction: type literals, interface definitions, type alias resolution, required vs optional flags.
  - JSX rendering hierarchy: parent-child component links, prop names passed, conditional rendering flags (`LogicalExpression`, `ConditionalExpression`).
  - Hook references: `useState`, `useEffect`, `useContext`, `useReducer`, `useRef`, `useMemo`, `useCallback`, custom `use*` hooks, and dependency array extraction.
  - Context providers and consumers: `createContext`, `<Context.Provider>`, `useContext()`, `<Context.Consumer>`.
  - Route discovery: Next.js App Router (`page.tsx`, `layout.tsx`, route groups `(group)`, dynamic params `[id]`), Next.js Pages Router, React Router `<Route path="..." element={<Comp />} />`.
  - State management patterns: local component state, React Context, Zustand store hooks, Redux (`useSelector`, `useDispatch`), TanStack Query (`useQuery`).
  - API client call detection: `fetch()`, `axios`, custom clients; classification of static literal endpoints vs dynamic template literals.
- Worker pipeline integration in `@codaryn/analysis-worker`:
  - `frontend` stage executing between `graph` and `diagnostics`.

### Acceptance criteria

- [x] Recognized components are indexed.
- [x] Detected component references are linked.
- [x] Page and route structures are visible.
- [x] Hook and context relationships are traceable.
- [x] API clients link to known backend endpoints only when evidence supports the mapping.

**Milestone:** Frontend architecture exploration.

## Planning and dependencies

**Status:** Implemented. All acceptance criteria and verification scenarios have been executed with passing results.

**Dependencies:** Phase 5 graph and evidence; backend cross-links depend on Phase 7.

## Key Implementation Artifacts

1. `@codaryn/contracts` (`packages/contracts/src/frontend.ts`):
   - Strict Zod schemas and TypeScript types for components, JSX elements, hooks, contexts, routes, state variables, API clients, and query responses.
2. `@codaryn/frontend-analyzer` (`packages/frontend-analyzer/`):
   - AST extractors: `components.ts`, `hooks-contexts.ts`, `routes.ts`, `state-api.ts`.
3. `@codaryn/database` (`packages/database/migrations/0008_frontend_intelligence.sql`, `schema.ts`):
   - Tables and indexes for components, JSX hierarchy, hooks, contexts, routes, state, and API clients.
4. `@codaryn/analysis-worker` (`workers/analysis/src/processor.ts`):
   - Dedicated `frontend` stage persisting extracted models.
5. `@codaryn/api` (`apps/api/src/frontend/`):
   - Query service and REST routes with tenant verification.
6. `@codaryn/web` (`apps/web/app/frontend/page.tsx`, `apps/web/src/features/frontend-explorer/`):
   - Interactive dashboard and slide-over inspector.
7. Fixtures (`fixtures/repositories/frontend-app/`):
   - Controlled test repository with Next.js App Router, React Router, Zustand, Context, and Fetch client.

[Full product specification](../../product-specification.md) · [All phases](../README.md)
