# Phase 11 architecture and security boundaries

## Data flow and component boundaries

The diagram and documentation system translates raw multi-domain analysis snapshots (symbols, frontend, backend, schema, execution, and quality) into interactive visual graphs, structured documents, and downloadable artifacts.

1. **Contracts (`@codaryn/contracts`):** Defines canonical types and schemas for:
   - Diagram models: `DiagramGraph`, `DiagramNode`, `DiagramEdge`, `DiagramType`, `DiagramLayoutConfig`.
   - Documentation models: `DocumentTemplateId`, `GeneratedDocument`, `DocumentSearchIndex`, `DocumentSearchResult`.
   - Export models: `ExportType`, `ExportFormat`, `ExportRequest`, `ExportJobResponse`, `ExportArtifactMetadata`.

2. **Diagram Engine (`@codaryn/diagram-engine`):** Implements pure rendering functions for 8 architectural views:
   - `system`: System overview combining components, routes, database tables, and external boundaries.
   - `frontend`: Component hierarchies, page routes, client-side state contexts, and hooks.
   - `backend`: Controllers, services, repositories, and HTTP route handlers.
   - `api`: Endpoint hierarchy, HTTP methods, route paths, and handler links.
   - `erd`: Entity-relationship diagram mapping tables, columns, primary keys, and foreign-key relations.
   - `dependencies`: Source module graph depicting import and export links.
   - `execution`: Function call graphs, execution sequences, and flow transitions.
   - `infrastructure`: Container definitions, Docker Compose services, and CI/CD pipelines.
   - Also provides Mermaid flowchart generation and confidence legend classification.

3. **Documentation Engine (`@codaryn/documentation-engine`):** Houses 10 deterministic templates:
   - `overview`, `system-boundaries`, `frontend-components`, `api-reference`, `data-models`, `data-flow`, `security-considerations`, `deployment-architecture`, `infrastructure-inventory`, and `quality-baseline`.
   - Assembles Markdown with embedded analyzer version, commit SHA, and section anchors.
   - Generates an in-memory tokenized search index supporting instant full-text filtering across document titles, headings, and body content.

4. **Export Engine (`@codaryn/export-engine`):** Converts graphs and documents into downloadable files:
   - `svg` / `png`: Scalable Vector Graphics with node styling and coordinate placement.
   - `dbml`: Database Markup Language definitions for database schemas.
   - `markdown`: Clean Markdown documentation.
   - `html` / `pdf`: Standalone printable HTML reports with CSS styling and diagram previews.
   - `mermaid`: Raw Mermaid diagram code.
   - `json`: Structured JSON representation of graphs and document trees.
   - Sanitizes all exported content using `sanitizeExportContent` to strip credentials and secrets.
   - Sanitizes filenames using `sanitizeFilename` to eliminate header injection and directory traversal.

5. **Persistence & Database (`@codaryn/database`):**
   - Migration `0014_diagrams_documentation.sql` adds 4 new tables:
     - `saved_diagram_layouts`: User-modified node positions, zoom levels, and layout options scoped by organization and diagram type.
     - `analysis_generated_documents`: Pre-rendered or cached document content with commit metadata and search tokens.
     - `export_jobs`: Asynchronous worker job queue with attempts, lease locks, and status transitions.
     - `export_artifacts`: Generated file payloads with content types, SHA-256 hashes, byte sizes, and timestamps.

6. **Worker Processing (`@codaryn/export-worker`):**
   - Background worker claiming queued export jobs using `SELECT ... FOR UPDATE SKIP LOCKED`.
   - Verifies tenant authorization before processing; fails closed if user or organization permissions are revoked.
   - Generates artifacts asynchronously and writes payloads atomically to `export_artifacts`.

7. **API Layer (`apps/api`):**
   - `apps/api/src/diagrams`: REST endpoints for diagram retrieval and layout configuration persistence.
   - `apps/api/src/exports`: REST endpoints for scheduling exports, checking job progress, and streaming downloadable artifacts.
   - Strict session authentication, advisory locking, and rate limiting (10 jobs/minute).

8. **Web Workspace (`apps/web`):**
   - `apps/web/src/features/architecture`: Interactive SVG canvas with dragging, zoom, pan, layout persistence, source code navigation, and export modal.
   - `apps/web/src/features/documentation`: Studio featuring template drawer, search filter, metadata badges, and split-pane markdown reader.

## Security controls

- **Secret Redaction:** High-confidence regular expressions identify and redact:
  - GitHub Personal Access Tokens (classic `ghp_...` and fine-grained `github_pat_...`)
  - Slack API tokens (`xoxb-...`, `xoxa-...`)
  - AWS access keys (`AKIA...`)
  - Private key blocks (RSA, EC, OPENSSH)
  - HTTP Authorization `Bearer` tokens
  - Database connection URLs (`postgres://`, `mysql://`, `mongodb://`) redacting passwords while retaining protocols and hosts.
- **Header & Path Injection Defense:** `sanitizeFilename` removes newlines (`\r`, `\n`), null characters (`\0`), and path separators (`/`, `\`, `..`) to protect HTTP `Content-Disposition` headers and file download streams.
- **Cross-Tenant Boundaries:** Every query filters on `organization_id` matching the verified user session. Cross-tenant access triggers `WorkspaceAccessError` and returns 404/403.
- **Fail-Closed Worker Lifecycle:** When tenant verification fails inside the worker, the job transitions immediately to `failed` status with an `UNAUTHORIZED` message without publishing an artifact.
