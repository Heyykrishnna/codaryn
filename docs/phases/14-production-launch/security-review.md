# Phase 14 internal security review

This is an engineering review with executable regression evidence, not an independent penetration test or certification.

| Finding                                                                  | Resolution                                                                                       | Evidence                                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Graph/frontend/backend registrars ignored their authentication parameter | Shared current-session/workspace/job/repository guard; no-store and nondisclosing errors         | Real release API fixture tests unauthenticated, outsider, mismatched workspace, removed member and revoked repository requests |
| Compiler host fell back to arbitrary host filesystem paths               | Memory-backed repository plus direct trusted TypeScript standard-library files only              | Temporary host sentinel denied by file/read/source/directory APIs and by an importing program                                  |
| Production analysis entry point processed only foundation smoke jobs     | Real pinned-archive consumer, bounded input, current authorization and atomic fenced publication | Real database processor plus killed-child recovery, concurrent claims, rejected revoked access and no script sentinel          |
| Stable artifact IDs could collide across identical paths in jobs         | Persisted IDs and relationships are scoped by job                                                | Two jobs of the same archive retain distinct complete node sets                                                                |
| Missing API-wide resource admission and outage behavior                  | Shared request budget, fixed-minute expiry, bounded bodies/statements, 20-job workspace queue    | Multi-instance concurrency, real 429/Retry-After, full queue and fail-closed outage fixtures                                   |
| Unbounded graph transfer/render and traversal                            | Bounded pages/frontiers/SVG, canceled reads and delayed search                                   | 10,000-node HTTP and render gates, stable pages and search assertions                                                          |
| UI workspace state could survive a change of account                     | Workspace content keyed by current authenticated account                                         | Component ownership review; authorization remains server-side on every fetch                                                   |
| Operational error data could disclose request content                    | Fixed route-group/status counters; client schema rejects paths/messages; private bearer metrics  | Strict input/privacy assertions and unknown-error handler review                                                               |

## Existing safeguards reviewed

Session freshness, cookie and origin controls; GitHub webhook signature/generation validation; private repository archive traversal/link/size rejection; SQL parameterization; protected export/recipient grants; incremental corruption fallback; retention preview and protected references; nonroot runtime restrictions; dependency auditing and pinned GitHub Actions. Existing regression suites remain required.

## Residual risks and launch ownership

- Operators own TLS termination, proxy-header normalization, trusted CIDRs and direct API network isolation. The template does not certify a particular ingress provider.
- Shared IP budgets can affect users behind NAT; measure legitimate organization traffic before changing limits. They are application limits, not volumetric DDoS protection.
- Instance metrics and anonymous client samples are operational indicators, not audit or billing truth. Token distribution and external collector retention require operator controls.
- PostgreSQL restore drills establish fixture integrity, not production provider RPO/RTO. Operators must prove provider restoration and backup access.
- The supported analysis workload is bounded and static. No runtime behavior, exhaustive language support, independent security sign-off, formal accessibility certification or arbitrary-scale monorepo claim is made.
- Credential values remain outside version control. No live permissions, retention policies, repository subscriptions or workers were enabled by this work.

No unresolved issue in the reviewed implementation is intentionally hidden behind a skipped test. Remaining deployment qualifications must be approved by the release owner before a public launch.

## Browser policy compatibility

Web responses add frame denial, MIME protection, no-referrer, denied camera/microphone/geolocation, and production HSTS/CSP. The CSP follows the installed Next.js guide's policy for static/partial rendering: inline framework script/style support remains enabled; production eval and third-party scripts/connections are not allowed. Nonce-based strict CSP is incompatible with the current partial-prerendered shell, so strict nonce enforcement is not claimed. Deployments requiring it must qualify a dynamic-rendering architecture before go-live. No existing CSP was relaxed. Treat this compatibility exception as an explicit release-owner review item.
