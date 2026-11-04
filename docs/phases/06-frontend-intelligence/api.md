# Phase 6: Frontend architecture intelligence API reference

All endpoints require authentication and are scoped by workspace and analysis job ID.

## Base URL
`/api/v1/frontend`

## Endpoints

### 1. `GET /overview`
Returns summary statistics for the frontend architecture.

**Query parameters:**
- `workspaceId` (string, required): Organization or tenant identifier.
- `jobId` (string, required): Analysis job UUID.

**Response (200 OK):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "detectedFrameworks": ["nextjs_app", "react_router"],
  "totalComponents": 42,
  "totalRoutes": 8,
  "totalHooks": 76,
  "totalContexts": 3,
  "totalApiClients": 14,
  "stateManagementPatterns": ["local", "query", "zustand"]
}
```

---

### 2. `GET /components`
Retrieves components matching search and filter criteria.

**Query parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)
- `search` (string, optional): Case-insensitive substring match on component name or file path.
- `kind` (string, optional): Component kind filter (`function`, `arrow`, `class`, `memo`, `forward_ref`, `lazy`).

**Response (200 OK):**
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "components": [
    {
      "id": "comp:src/components/Button.tsx:function:Button:3:8",
      "name": "Button",
      "filePath": "src/components/Button.tsx",
      "kind": "function",
      "exportType": "named",
      "props": [
        { "name": "label", "type": "string", "required": true }
      ],
      "hooksCount": 1,
      "renderedComponentsCount": 0,
      "sourceEvidence": {
        "path": "src/components/Button.tsx",
        "startLine": 3,
        "endLine": 10
      }
    }
  ],
  "totalCount": 1
}
```

---

### 3. `GET /component`
Retrieves detailed drill-down information for a specific component.

**Query parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)
- `componentId` (string, required): Canonical component identifier.

**Response (200 OK):**
```json
{
  "component": { ... },
  "renderedComponents": [
    {
      "id": "jsx:src/Card.tsx:Button:7:8",
      "sourceComponentId": "comp:src/Card.tsx:function:Card:4:8",
      "targetComponentName": "Button",
      "targetComponentId": "comp:src/Button.tsx:function:Button:3:8",
      "props": ["label"],
      "isConditional": false,
      "sourceEvidence": { "path": "src/Card.tsx", "startLine": 7, "endLine": 7 }
    }
  ],
  "hooks": [ ... ],
  "state": [ ... ],
  "contextsConsumed": [ ... ],
  "apiCalls": [ ... ],
  "incomingRenders": [ ... ]
}
```

---

### 4. `GET /routes`
Retrieves routing tree and page endpoints.

**Query parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)
- `framework` (string, optional): `nextjs_app`, `nextjs_pages`, `react_router`, `custom`.

---

### 5. `GET /hooks`
Retrieves hook references across components.

**Query parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)
- `componentId` (string, optional)
- `kind` (string, optional): `state`, `effect`, `context`, `ref`, `callback`, `memo`, `custom`.

---

### 6. `GET /contexts`
Retrieves React Context definitions, providers, and consumers.

**Query parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)

---

### 7. `GET /state`
Retrieves state management variables and stores.

**Query parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)
- `componentId` (string, optional)
- `kind` (string, optional): `local`, `context`, `zustand`, `redux`, `query`, `other`.

---

### 8. `GET /api-clients`
Retrieves network API client calls.

**Query parameters:**
- `workspaceId` (string, required)
- `jobId` (string, required)
- `componentId` (string, optional)
- `clientType` (string, optional): `fetch`, `axios`, `custom`.

---

## Error responses

- `400 Bad Request`: `INVALID_REQUEST` with validation error messages.
- `404 Not Found`: `NOT_FOUND` when the specified analysis job or component does not exist in the tenant's workspace.
