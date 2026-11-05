# Phase 14 qualification boundaries

The reproducible gates qualify a controlled single-instance application/database workload. Local host and isolated Node 22 runtime measurements are recorded separately. They are regression budgets, not an availability/latency SLA or a claim that every repository is fast.

- Graph API pages display 200 nodes and up to 400 within-page relationships; pagination does not accumulate the full graph in browser memory. Search covers stored nodes, while the graph's local filter covers the current page. Neighborhoods may omit additional edges after their explicit limit. Summary endpoints are bounded; no-cycle results are not proof of runtime acyclicity.
- The golden fixture uses 1,000 TypeScript function modules and 999 expected direct import edges. It also validates full/incremental semantic equivalence and corrupted input rebuilding. It does not prove all dynamic imports, variable references, reflection or every framework relationship.
- The ordinary analysis consumer accepts 1,000 candidate TS/JS/JSON files and 16 MiB selected source. Large repositories beyond these limits fail explicitly. Other stage-specific analyzers keep their documented limits. Repository scripts and compiler plugins are not executed.
- Rendering tests use server-rendered real React components with bounded SVG/control output; browser checks verify actual account/empty states and responsive layouts. Formal screen-reader audits and populated live end-to-end journeys require staging qualification with approved data.
- Offline use is limited to the downloaded public guide. Private workspace records, source, credentials and link fragments are not persisted to browser storage or a service worker.
- Client performance/error collection sends only fixed metric names and numeric values; delivery is nonfatal. Metrics live in bounded process memory, reset on restart and require an external collector for durable monitoring/alerts.
- Retention is manually enforced by reviewed Phase 13 previews. No live purge, source/archive deletion or backup schedule is silently enabled.
- API/web and worker images/templates are provided and tested without launching the user's live queues. TLS ingress, provider-level backup/recovery, realistic production load, independent review and final go-live approval remain deployment responsibilities.
