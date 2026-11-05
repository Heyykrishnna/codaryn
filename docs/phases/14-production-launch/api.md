# Phase 14 operational and graph API

Protected endpoints retain their existing session, allowed-origin and CSRF contracts. Legacy `/api/v1/graph/*`, `/frontend/*` and `/backend/*` now require valid workspace/job UUIDs, current membership, a nondeleted workspace, matching repository/installation ownership, active repository, connected installation and an uncancelled job. Responses remain `no-store`; errors disclose no SQL or internal exception text.

## Probes and metrics

| Route                            | Access                                     | Behavior                                                                                                                                                      |
| -------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/health`             | Public                                     | Process liveness; remains healthy during a database outage                                                                                                    |
| `GET /api/v1/ready`              | Public                                     | Database connectivity; 200 ready or 503 unavailable without internal details                                                                                  |
| `GET /api/v1/operations/metrics` | `Authorization: Bearer <OPERATIONS_TOKEN>` | Instance-only request counters, duration buckets, memory/uptime, database pool saturation and anonymous client measurements; absent/invalid token returns 404 |
| `POST /api/v1/operations/client` | Exact configured web Origin                | Strict 512-byte body `{name,value}`; name is LCP, INP, CLS or client-error. No URL, account, workspace, error message or stack is accepted                    |

Operational metrics are bounded in-memory aggregates and reset on restart. Configure an external collector using the private token; do not expose metrics publicly. Client metrics are untrusted, best effort and not billing or security audit evidence. Failed delivery returns a nonfatal result. No persistent browser cache or external analytics provider is introduced.

Ingress shares fixed-minute PostgreSQL counters across instances. Identity traffic is limited to 60 requests/minute per effective IP; each fixed API group uses 240/minute. Counters store HMAC digests of group/IP, not IPs or tokens. Expired windows are pruned during traffic. 429 includes Retry-After. If the budget database is unavailable, guarded requests fail closed with 503. Probes bypass the request budget for health diagnosis. Forwarded headers are ignored by default; TRUSTED_PROXY must identify a protected trusted proxy, never arbitrary internet clients.

## Progressive graph

`GET /api/v1/graph/snapshot?workspaceId=...&jobId=...&page=1&search=...` returns at most 200 matching nodes and 400 relationships between nodes on that page. Page is 1–1000; search is at most 256 characters. Ordering is path then ID. Additive fields are page, pageSize, hasMore and truncated. totalNodes is the count matching the node query; edge/cycle/metric summaries describe the returned window. Cross-page edges are intentionally omitted; inspect neighborhoods for adjacent evidence. Snapshot payloads above 1 MiB fail with 422 rather than returning an unbounded graph.

Neighborhood requests retain nodeId, depth 1–5 and incoming/outgoing/both direction. They query bounded frontiers, returning at most 200 nodes/400 edges with explicit truncation. Cycle, unresolved-reference and metric endpoints return bounded 200-row summaries. These are static findings, not proof of runtime acyclicity or execution.

## Analysis queue

Start/retry operations serialize admission per workspace and permit at most 20 queued/running analyses. Full queues return 429. New jobs require a valid pinned manifest commit. The real consumer claims queued jobs with a UUID lease, counts attempts on claim and recovers five-minute abandoned leases. API retry no longer pre-consumes the worker's next attempt. Failure codes are fixed strings; source and SQL errors are not copied to job logs.
