# Phase 4: Analysis API Reference

All analysis endpoints are mounted under `/api/v1/analysis` on the API server. All requests require workspace context via the `workspaceId` query parameter or body property, and authorized caller sessions.

---

### 1. Start Analysis Job

Initiates a static analysis run for a given repository and manifest ref.

- **Method**: `POST`
- **Path**: `/api/v1/analysis/start`
- **Headers**: `Content-Type: application/json`, `x-codaryn-request: workspace`
- **Request Body**:
  ```json
  {
    "workspaceId": "018f3a2b-1111-7000-8000-000000000001",
    "repositoryId": "018f3a2b-2222-7000-8000-000000000002",
    "manifestId": "018f3a2b-3333-7000-8000-000000000003",
    "ref": "main"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "job": {
      "id": "018f3a2b-4444-7000-8000-000000000004",
      "manifestId": "018f3a2b-3333-7000-8000-000000000003",
      "repositoryId": "018f3a2b-2222-7000-8000-000000000002",
      "status": "queued",
      "currentStage": "inventory",
      "stages": [
        { "stage": "inventory", "status": "pending", "itemsTotal": 0, "itemsCompleted": 0 },
        { "stage": "configuration", "status": "pending", "itemsTotal": 0, "itemsCompleted": 0 },
        { "stage": "parsing", "status": "pending", "itemsTotal": 0, "itemsCompleted": 0 },
        { "stage": "symbols", "status": "pending", "itemsTotal": 0, "itemsCompleted": 0 },
        { "stage": "diagnostics", "status": "pending", "itemsTotal": 0, "itemsCompleted": 0 },
        { "stage": "completed", "status": "pending", "itemsTotal": 0, "itemsCompleted": 0 }
      ],
      "fileCount": 0,
      "symbolCount": 0,
      "diagnosticCount": 0,
      "retries": 0,
      "createdAt": "2026-11-04T00:00:00.000Z",
      "updatedAt": "2026-11-04T00:00:00.000Z",
      "completedAt": null,
      "failureReason": null
    }
  }
  ```

---

### 2. Get Analysis Job Progress

Inspects the current execution stage, timing, and progress metrics of an analysis job.

- **Method**: `GET`
- **Path**: `/api/v1/analysis/job`
- **Query Parameters**:
  - `workspaceId`: UUID of the workspace (required)
  - `jobId`: UUID of the analysis job (required)
- **Response**: `200 OK`
  Returns the `AnalysisJobSummary` object.

---

### 3. Cancel Analysis Job

Cooperatively terminates a queued or running analysis job.

- **Method**: `POST`
- **Path**: `/api/v1/analysis/cancel`
- **Request Body**:
  ```json
  {
    "workspaceId": "018f3a2b-1111-7000-8000-000000000001",
    "jobId": "018f3a2b-4444-7000-8000-000000000004"
  }
  ```
- **Response**: `200 OK`
  Returns the updated `AnalysisJobSummary` with `status: "cancelled"`.

---

### 4. Retry Analysis Job

Retries a failed or cancelled analysis job if the retry count is below the maximum allowed threshold (3).

- **Method**: `POST`
- **Path**: `/api/v1/analysis/retry`
- **Request Body**:
  ```json
  {
    "workspaceId": "018f3a2b-1111-7000-8000-000000000001",
    "jobId": "018f3a2b-4444-7000-8000-000000000004"
  }
  ```
- **Response**: `200 OK`
  Returns the updated `AnalysisJobSummary` with incremented `retries` and `status: "queued"`.

---

### 5. Get File Inventory

Retrieves classified source files and breakdown summaries for an analysis run.

- **Method**: `GET`
- **Path**: `/api/v1/analysis/inventory`
- **Query Parameters**:
  - `workspaceId`: UUID (required)
  - `jobId`: UUID (required)
- **Response**: `200 OK`
  ```json
  {
    "jobId": "018f3a2b-4444-7000-8000-000000000004",
    "files": [
      {
        "path": "src/index.ts",
        "extension": ".ts",
        "language": "typescript",
        "role": "source",
        "sizeBytes": 1024,
        "frameworks": ["react"],
        "linesOfCode": 45
      }
    ],
    "summary": {
      "totalFiles": 1,
      "totalLines": 45,
      "byLanguage": { "typescript": 1 },
      "byRole": { "source": 1 }
    }
  }
  ```

---

### 6. Get Symbol Inventory

Retrieves extracted functions, classes, interfaces, types, and imports/exports.

- **Method**: `GET`
- **Path**: `/api/v1/analysis/symbols`
- **Query Parameters**:
  - `workspaceId`: UUID (required)
  - `jobId`: UUID (required)
  - `kind`: Optional filter (`function`, `class`, `interface`, `type`, `import_export`)
- **Response**: `200 OK`
  Returns `{ jobId, functions, classes, interfaces, types, importsExports, totalCount }`.

---

### 7. Get Diagnostics

Retrieves compiler diagnostics and parse errors collected during analysis.

- **Method**: `GET`
- **Path**: `/api/v1/analysis/diagnostics`
- **Query Parameters**:
  - `workspaceId`: UUID (required)
  - `jobId`: UUID (required)
- **Response**: `200 OK`
  ```json
  {
    "jobId": "018f3a2b-4444-7000-8000-000000000004",
    "diagnostics": [
      {
        "id": "diag-1",
        "path": "src/syntax-error.ts",
        "message": "';' expected.",
        "severity": "error",
        "code": "1005",
        "location": {
          "path": "src/syntax-error.ts",
          "startLine": 1,
          "startColumn": 15,
          "endLine": 1,
          "endColumn": 16
        }
      }
    ],
    "errorCount": 1,
    "warningCount": 0
  }
  ```
