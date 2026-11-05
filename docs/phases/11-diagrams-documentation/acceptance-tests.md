# Phase 11 acceptance tests

**Status:** Executed and verified. Original scope and acceptance criteria: [phase overview](README.md).

All scenarios have been implemented and validated through unit, integration, and contract tests across `@codaryn/contracts`, `@codaryn/diagram-engine`, `@codaryn/documentation-engine`, `@codaryn/export-engine`, `@codaryn/database`, `@codaryn/export-worker`, `@codaryn/api`, and `@codaryn/web`.

| ID | Scenario and action | Expected result | Test evidence & verification |
|---|---|---|---|
| P11-AT01 | **Snapshot consistency:** Generate each supported diagram (8 types) and document (10 templates) from a selected analysis. | All outputs use that identical snapshot and include commit and analyzer metadata. | `packages/diagram-engine/src/diagrams.test.ts`, `packages/documentation-engine/src/documentation.test.ts`. Confirmed all generated diagrams and documents retain `jobId`, `commitSha`, and `analyzerVersion`. |
| P11-AT02 | **Evidence and uncertainty:** Inspect confirmed architectural claims and inferred or unresolved relationships. | Confirmed claims link to exact source file and line evidence; inferred relationships are explicitly labeled with `confidence: "inferred"` or `"unresolved"` in legend and graph models. | `packages/diagram-engine/src/diagrams.test.ts`. Confirmed nodes and edges reflect evidence provenance, file paths, line ranges, and confidence levels. |
| P11-AT03 | **Export and layout:** Save custom node positions and layout settings, reload them, and export supported formats (SVG, DBML, Markdown, HTML/PDF, Mermaid, JSON). | Layout coordinates persist in `saved_diagram_layouts`; exported artifacts incorporate saved layouts, apply SHA-256 verification, and sanitize sensitive tokens. | `packages/export-engine/src/export.test.ts`, `packages/database/src/diagrams.test.ts`, `apps/api/src/diagrams/diagrams.test.ts`. Verified layout persistence and multi-format rendering. |
| P11-AT04 | **Access and failure:** Attempt an unauthorized export across tenant boundaries and simulate worker processing failure. | Access is denied across tenants with `WorkspaceAccessError` (404/403); failed jobs record failure codes without creating misleading completed artifacts. | `apps/api/src/exports/exports.test.ts`, `workers/export/src/process.test.ts`, `packages/export-engine/src/security.test.ts`. Verified fail-closed tenant boundary and lease expiry recovery. |

## Cross-cutting checks

- **Tenant isolation:** Every database query in API services and background workers explicitly verifies `organization_id` matching the authenticated session. Non-members receive `WorkspaceAccessError`.
- **Secret sanitization:** Content exported in diagrams, documents, and schema models is sanitized to strip API tokens (GitHub, Slack, AWS), private keys, Bearer headers, and database connection passwords.
- **Filename sanitization:** Filenames in HTTP `Content-Disposition` headers are sanitized to eliminate CRLF injection, null bytes, and path traversal sequences (`../`, `/`, `\`).
- **Layout validation:** Layout configurations passed to `/diagrams/layout` are validated against strict Zod schemas (`diagramLayoutConfigSchema`) enforcing coordinate boundaries and finite numbers.
- **Worker concurrency:** Export queue polling uses `FOR UPDATE SKIP LOCKED` with explicit lease identifiers and 5-minute timeouts, ensuring exactly-once processing per attempt up to 3 retries.
- **Rate limiting:** API endpoints restrict export job scheduling to a maximum of 10 jobs per organization per minute.
