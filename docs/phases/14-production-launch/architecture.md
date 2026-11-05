# Phase 14 production readiness design

## Baseline and scope

The legacy graph, frontend and backend route registrars receive an authentication dependency but do not use it. Their services check only that a job belongs to a caller-supplied workspace. This is a release-blocking authorization defect. Graph snapshots and neighborhoods also load entire node/edge collections, and the SVG view renders every returned node. Existing API sessions, CSRF checks, immutable export bindings, lease recovery, incremental fallback and reviewed retention are reused.

Protected analysis reads will authenticate and verify current membership, workspace state, repository and job ownership before querying. Private reads remain no-store; no browser persistence or shared response cache will be added. Public operational documentation can be downloaded for offline use without storing private data. Public static assets retain framework caching.

Progressive graph navigation will request stable bounded node pages with edges restricted to visible endpoints. Search is server filtered, debounced and cancelable. Neighborhood expansion is bounded by nodes, edges and depth. Old snapshot consumers retain their response shape with additive pagination metadata. Query indexes follow these access patterns and are verified using representative query plans.

API ingress uses bounded bodies, database statement timeouts and a shared database-backed request budget. Identity is never taken from forwarded headers unless an explicit trusted proxy is configured. Health probes disclose no database details. Operational metrics contain fixed route groups, counters and duration buckets, never paths, IDs, queries, request bodies or error messages. Production deployment requires HTTPS, stable authentication secrets and operator-managed backups.

## Predeclared validation budgets

These are reproducible regression gates for the controlled fixtures, not production SLA claims. Record hardware/runtime and raw results before release approval.

- Graph page: at most 200 nodes and 400 connecting edges; neighborhood at most 200 nodes/400 edges and depth at most 5. At 10,000 stored nodes, a page response must remain below 1 MiB, with no more than 200 rendered interactive nodes.
- Local load: 200 requests at concurrency 10, zero unexpected 5xx responses, p95 below 2 seconds. Deliberate throttling is tested separately and must return 429 with Retry-After; database outages must fail closed.
- Golden analysis: 1,000 generated TypeScript modules, full and incremental consistency, parser/symbol/graph pipeline below 30 seconds and measured RSS increase below 512 MiB in the controlled benchmark. Store measurements as artifacts; no claimed speedup without comparable measurements.
- Recovery: abandoned leases must be reclaimable with fenced publication and bounded attempts. Full rebuild must match a trusted golden snapshot after corrupted incremental input.
- Backup drill: restore a disposable PostgreSQL custom-format backup into a separate clean database, then verify schema/auth and representative row counts/hashes. Never restore over an existing database or use production fixture data.
- UI: keyboard-accessible graph selection, visible focus, labeled controls, responsive 390 px layout without document overflow, accessible error recovery. Automated checks supplement browser inspection; formal assistive-technology certification is not inferred.

## Release boundary

Implementation and controlled qualification do not deploy a public production service, start live workers, execute live retention, establish a provider backup schedule or grant merge approval. Provider recovery objectives, realistic organization-scale load and independent security sign-off require named operator ownership. The verification record must distinguish completed tests from those operational requirements.
