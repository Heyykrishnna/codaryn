# Phase 7: Backend Intelligence API Specification

All backend intelligence endpoints require authentication and enforce workspace boundaries via `workspaceId` and `jobId` query parameters.

## Endpoints

### 1. `GET /api/v1/backend/overview`
Retrieves summary metrics for the analyzed backend codebase.

**Query Parameters:**
- `workspaceId` (string, required): Organization/workspace UUID.
- `jobId` (string, required): Analysis job UUID.

**Response Body:**
```json
{
  "jobId": "string",
  "detectedFrameworks": ["express", "nestjs"],
  "totalRoutes": 24,
  "totalControllers": 6,
  "totalServices": 8,
  "totalRepositories": 5,
  "totalMiddleware": 12,
  "totalRequestFlows": 24,
  "authenticationPatterns": ["auth", "jwt"],
  "validationPatterns": ["zod"]
}
```

### 2. `GET /api/v1/backend/routes`
Lists detected HTTP endpoints with filtering.

**Query Parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)
- `framework` (string, optional): `express` | `fastify` | `nestjs` | `custom`
- `method` (string, optional): HTTP method
- `search` (string, optional): Substring matching path or handler name

**Response Body:**
```json
{
  "jobId": "string",
  "routes": [
    {
      "id": "route:express:src/routes.ts:GET:/api/v1/users",
      "framework": "express",
      "method": "GET",
      "path": "/api/v1/users",
      "filePath": "src/routes.ts",
      "handlerName": "getUsers",
      "handlerSymbolId": null,
      "controllerName": "UserController",
      "middleware": ["authMiddleware"],
      "isDynamic": false,
      "sourceEvidence": { "filePath": "src/routes.ts", "startLine": 12, "endLine": 18 }
    }
  ],
  "totalCount": 1
}
```

### 3. `GET /api/v1/backend/routes/:routeId`
Returns complete cross-layer inspection data for a single route.

**Query Parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)

**Response Body:**
```json
{
  "route": { ... },
  "controller": { ... },
  "services": [ ... ],
  "repositories": [ ... ],
  "middlewareChain": [ ... ],
  "requestFlow": { ... }
}
```

### 4. `GET /api/v1/backend/controllers`
Returns all controller definitions and their base paths.

### 5. `GET /api/v1/backend/services`
Returns all service classes with their public methods and constructor dependencies.

### 6. `GET /api/v1/backend/repositories`
Returns all repository classes classified by ORM type (`drizzle`, `prisma`, `typeorm`, `kysely`, `sql`).

### 7. `GET /api/v1/backend/middleware`
Returns discovered middleware functions, guards, and interceptors with their scope.

### 8. `GET /api/v1/backend/request-flows`
Returns reconstructed end-to-end call traces from route to persistence.
