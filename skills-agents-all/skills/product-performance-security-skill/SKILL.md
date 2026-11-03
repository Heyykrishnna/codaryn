---
name: product-performance-security
version: 1.0.0
description: >-
  Plan, audit, and implement production-grade web application performance,
  layered caching, data freshness, reliability, and security. Use when optimizing
  page loading, reducing unnecessary backend or database calls, adding Redis or
  browser caching, improving Core Web Vitals, securing cached data, or reviewing
  a product before production.
---

# Product Performance & Security Engineering Skill

## Mission

Improve the product's real-world speed, responsiveness, reliability, and security without weakening correctness, authorization, or maintainability.

The backend must not be called unnecessarily for every read. Reuse data safely through the appropriate cache layer, load critical content quickly, and refresh data intelligently. The database or designated system of record remains authoritative.

**Primary principle:** cache deliberately, authorize every request, invalidate after successful writes, and measure the result.

Do not interpret this skill as permission to cache every response or copy the entire database into Redis or browser storage.

## Non-negotiable engineering rules

1. Inspect the existing repository, framework version, deployment platform, database, authentication flow, and current data-fetching patterns before changing code.
2. Measure or identify the bottleneck before introducing infrastructure. Do not add Redis, a service worker, a client database, or another dependency when a simpler existing layer solves the problem.
3. The database or explicitly designated upstream system remains the source of truth. A cache is disposable and must be rebuildable.
4. Never allow a cache hit to bypass authentication, authorization, tenant isolation, ownership checks, or business rules.
5. Never put passwords, access tokens, refresh tokens, session identifiers, API keys, payment secrets, or other credentials in `localStorage`, `sessionStorage`, IndexedDB, the Cache API, URLs, or cache keys.
6. Do not put user-specific, tenant-specific, or authorization-dependent responses in a shared CDN or public cache.
7. Every cacheable item must have an explicit owner, key strategy, freshness policy, TTL or invalidation rule, and failure behavior.
8. Every write path must define how affected cache entries are invalidated or refreshed. Do this only after the authoritative write succeeds.
9. Use framework APIs that match the version installed in the repository. Do not copy caching examples from an older Next.js version without checking current documentation and project configuration.
10. Do not claim an optimization is complete until its behavior is tested and its impact is measured.

## 1. Start with repository and architecture discovery

Before implementation:

- Inspect package manifests, lockfiles, framework versions, build scripts, runtime configuration, Docker files, deployment configuration, and environment variable names.
- Identify the application entry points, route structure, server and client boundaries, API routes, server actions, data-access layer, database clients, and external services.
- Map the authentication and authorization model, including roles, tenants, row-level security, ownership rules, and session handling.
- Search for repeated requests, duplicated queries, request waterfalls, broad data downloads, polling loops, unnecessary component effects, and expensive client-side transformations.
- Identify which pages need SEO or server rendering, which data must be fresh, and which content can safely be reused.
- Check whether the platform already supplies CDN, static asset caching, framework data caching, route prefetching, or edge caching before adding another cache.
- Record a baseline where possible: initial load, route transition, API request count, database query count, payload size, cache hit rate, and p50/p95/p99 latency.

Produce a short architecture note before a substantial change. State the existing behavior, the bottleneck, the proposed cache layers, security boundaries, invalidation paths, and how the change will be validated.

## 2. Target request and rendering experience

Design the page so users see useful content quickly and secondary work does not block the initial render.

### First visit

1. Serve the route shell, metadata, styles, fonts, and critical assets efficiently. Prefer static rendering or server rendering when the route and data model support it.
2. Render meaningful above-the-fold content first. Use streaming, Suspense, or progressive loading for independent sections when supported by the framework.
3. Fetch critical data in parallel when dependencies allow. Avoid serial request waterfalls and duplicate client-to-server-to-backend hops.
4. Read reusable server data from the configured cache first. On a cache miss, load it from the authoritative database or upstream service, then populate the cache according to the data policy.
5. Defer non-critical widgets, analytics, recommendations, heavy charts, and below-the-fold content. Lazy-load large client components and third-party libraries when appropriate.
6. Do not block the whole page on data that is not required to make the initial screen useful.

### Returning visit

1. Reuse safe, unexpired client-side data to render a fast initial view where doing so is appropriate.
2. Revalidate data in the background or on navigation according to the resource's freshness policy.
3. Update the interface when fresh data arrives without unnecessarily resetting user state or causing layout shifts.
4. If offline or temporarily disconnected, show only data that is safe and meaningful to display as stale. Clearly handle stale state for critical data and provide a recovery path.
5. Re-check authorization on the server for every protected operation. A locally cached screen is not proof that the current user is still authorized.

### Navigation and interaction

- Use framework-supported route prefetching selectively. Avoid prefetching every large or expensive route without a reason.
- Deduplicate identical in-flight requests and reuse data already loaded for the current route.
- Use pagination, cursor-based loading, filtering, and virtualization for large collections.
- Avoid polling when event-driven updates, a longer interval, or revalidation on focus/navigation is sufficient.
- Keep client components small. Move data access and non-interactive work to server-side modules where the framework supports it.
- In Next.js, use Server Components and the Data Access Layer appropriately. Do not call an internal Route Handler from a Server Component just to make another server request; access the data layer directly. Use Client Components only where interactivity requires them.

## 3. Use a deliberate layered caching architecture

Use only the layers that solve a measured need. A typical web application may use the following layers:

| Layer                      | Responsibility                                                          | Suitable content                                           | Key safeguards                                                                    |
| -------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------- |
| CDN / edge cache           | Reuse public responses close to users                                   | Fingerprinted assets, public pages, public catalog data    | Never share personalized responses; define explicit cache headers and purge rules |
| Framework/server cache     | Reuse server-rendered output or server data                             | Static and revalidatable route data                        | Use version-correct APIs and explicit tags, paths, or revalidation policies       |
| Redis                      | Reuse expensive database or upstream reads across server instances      | Frequently accessed, reusable records and computed results | Namespaced keys, TTLs, authorization-aware key design, invalidation, monitoring   |
| Process memory             | Reuse small data within one server process                              | Tiny immutable configuration or short-lived computations   | Not shared across instances; bound memory; do not rely on it for correctness      |
| Browser memory             | Reuse data during the current page/session                              | Current route state and short-lived UI data                | Clear or partition on account changes; not authoritative                          |
| IndexedDB                  | Persist larger structured client data across visits                     | Non-sensitive offline data, drafts, bounded read models    | Schema versioning, expiry, quota handling, account isolation, cleanup             |
| Cache API / service worker | Reuse request/response assets and explicitly designed offline resources | Static assets and approved public GET responses            | Explicit allowlist; never cache authenticated API responses by default            |

Do not store an identical full data set in every layer. Assign each resource a clear caching policy and choose the smallest layer that provides the benefit.

### Cache classification

Classify every response or data resource before caching it:

| Class                                 | Examples                                                             | Default policy                                                                          |
| ------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Public immutable                      | Hashed JS/CSS bundles, versioned images, fonts                       | Long-lived CDN/browser cache with immutable URLs                                        |
| Public, slowly changing               | Public documentation, public catalog, published content              | CDN and/or server cache with bounded TTL and on-demand invalidation                     |
| Public, frequently changing           | Public status or live aggregate                                      | Short TTL or stale-while-revalidate, based on freshness requirements                    |
| User-specific, non-sensitive          | A user's display preferences or non-sensitive dashboard summary      | Private, identity-scoped cache only when justified; short TTL and explicit invalidation |
| Tenant-specific                       | Organization settings, tenant catalog, team dashboard                | Tenant-scoped keys and authorization on every request; never shared across tenants      |
| Sensitive or security-critical        | Credentials, payment details, private messages, permission decisions | Do not cache by default; use `no-store` for sensitive HTTP responses                    |
| Transactional or correctness-critical | Balances, inventory reservations, payment state, entitlements        | Read from the authoritative source or use a specifically reviewed consistency strategy  |

When classification is unclear, do not cache until the data owner and security policy are understood.

## 4. Redis cache-aside policy

Use cache-aside for repeated server-side reads where Redis materially reduces database or upstream load.

### Required read flow

1. Authenticate the request when the resource is protected.
2. Resolve the user's permissions and tenant context from trusted server-side identity data.
3. Validate and normalize all inputs that affect the result.
4. Build a structured, versioned cache key using only the required dimensions.
5. Attempt to read from Redis.
6. On a cache hit, still enforce the request's authorization rules before returning the result.
7. On a miss, fetch from the authoritative database or upstream system.
8. Cache only an approved result, using a TTL appropriate to its staleness tolerance.
9. Return the result and record cache-hit, miss, error, and latency metrics.

### Key design

Use keys that are predictable, versioned, bounded, and isolated by environment and application. Example:

```text
<app>:<environment>:v<schema-version>:<tenant-id>:<resource>:<resource-id>:<normalized-query-hash>
```

For user-specific resources, include the trusted user identifier when the representation varies by user. Include role, locale, permission version, or other dimensions only when they actually affect the cached representation. Do not use untrusted client-supplied tenant IDs as the security boundary.

Never include passwords, tokens, session IDs, API keys, or other secrets in keys. Avoid raw sensitive query parameters. Normalize query parameters and sort them consistently before hashing.

### TTL and freshness

- Every Redis entry must have a finite TTL unless a reviewed, explicit lifecycle policy says otherwise.
- Choose TTL based on how stale the product can safely be, not just on convenience.
- Use a shorter TTL for user-specific or frequently changing information.
- Add TTL jitter to reduce many keys expiring simultaneously.
- Treat TTL as a maximum stale window, not as the only invalidation mechanism.
- Consider stale-while-revalidate only for data where briefly serving stale content is acceptable.
- Consider short-lived negative caching for known not-found lookups only when it is safe, and ensure newly created records become visible promptly.
- Do not cache transient errors, authorization failures, validation errors, or arbitrary 5xx responses as successful data.

Starting TTLs are hypotheses, not universal defaults. Tune from product freshness requirements and measured hit rates.

| Resource type                          |                                                                                             Initial TTL to evaluate |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------: |
| Public, slowly changing reference data |                                                                                                        5-30 minutes |
| Public catalog or listing              |                                                                                                        1-10 minutes |
| Non-sensitive user dashboard summary   |                                                                                                       15-60 seconds |
| User preferences                       |                                                                                1-5 minutes, plus write invalidation |
| Permission or entitlement state        | Prefer authoritative checks; if cached, use a very short, explicitly reviewed TTL and immediate revocation strategy |
| Transactional state                    |                                                                 No general cache; use a correctness-specific design |

### Cache stampede and Redis failure handling

- Prevent popular-key stampedes with request coalescing/single-flight or a carefully implemented short-lived lock.
- Use atomic lock acquisition and token-checked lock release. Never allow one worker to release another worker's lock.
- Keep lock TTL longer than the expected data-loader time, with a safe timeout and fallback.
- Add jitter to expirations and consider early refresh for very hot keys.
- Bound Redis connection timeouts, retries, and memory use. Do not retry indefinitely.
- Define a controlled Redis outage path. For safe reads, fall back to the authoritative store with rate limits, concurrency limits, and observability. For critical flows, fail safely rather than returning unverified data.
- Do not let Redis availability become a hidden dependency for authentication or authorization correctness.

## 5. Cache invalidation and data changes

Cache invalidation is part of the write feature, not an optional cleanup task.

For every mutation, document the affected keys, tags, route data, browser records, and dependent aggregates.

### Required write sequence

1. Authenticate and authorize the mutation.
2. Validate input on the server using a schema and enforce business rules.
3. Write to the authoritative database inside the appropriate transaction.
4. Commit the transaction successfully.
5. Invalidate or version-bump the affected cache entries after commit.
6. Publish an event or use an outbox when invalidation must be reliable across services or processes.
7. Refresh active client views, or have them revalidate on the next navigation/focus according to the product requirement.
8. Record invalidation success/failure and the time until all relevant cache layers are consistent.

Do not invalidate before a transaction commits. Do not update Redis first and assume the database write will succeed. Do not rely only on a long TTL for data that must become fresh after a user action.

### Invalidation techniques

- Prefer targeted key deletion or framework-supported tag/path invalidation over flushing the whole cache.
- Use resource versions or generations when deleting every dependent key is difficult.
- Use an outbox or durable event mechanism if a database commit must reliably trigger cache invalidation in another process.
- Use Pub/Sub only as a notification mechanism when lost messages are acceptable or backed by a durable recovery strategy. Pub/Sub alone is not a durable invalidation queue.
- Invalidate related aggregates and list caches when a record is created, updated, deleted, moved, or changes visibility.
- Invalidate browser-persisted data using a version, updated timestamp, account namespace, or explicit cleanup event.
- On logout, account switching, tenant switching, or permission revocation, clear or make inaccessible the relevant client-side cache immediately.

### Freshness contract

For each resource, specify one of these contracts:

- **Strong freshness:** a successful write must be visible to the writer on the next read. Bypass stale cache or invalidate synchronously after commit.
- **Bounded staleness:** stale data is acceptable for a documented maximum duration, with a finite TTL and monitoring.
- **Eventual freshness:** changes propagate asynchronously, with a documented propagation target and recovery process.

Do not silently use eventual consistency for security, payment, authorization, inventory, or other critical operations.

## 6. Browser storage and offline caching

Browser storage improves repeat visits, but it is controlled by the client and must never be trusted as authoritative.

### Choose the right store

- **In-memory state:** first choice for ephemeral UI state and same-session reuse.
- **`sessionStorage`:** only for small, non-sensitive state that should disappear when the tab session ends.
- **`localStorage`:** only for small, non-sensitive preferences or harmless UI settings. Avoid using it for tokens or private records.
- **IndexedDB:** use for larger structured non-sensitive datasets, bounded offline content, or drafts that need to survive reloads. Add schema migrations, expiry, cleanup, and storage quota handling.
- **Cache API/service worker:** use an explicit request allowlist for static assets and carefully reviewed public GET responses. Do not cache authenticated API responses by default.

### Mandatory browser-cache safeguards

- Treat every browser-stored value as untrusted input. Validate it before use.
- Do not store session identifiers or authentication tokens in Web Storage or IndexedDB. Prefer appropriately configured secure, HttpOnly, SameSite cookies for session transport, following the application's authentication design.
- Do not store payment data, secrets, or sensitive personal records in client storage unless a formal product and security review approves a specific design.
- Partition records by authenticated account and tenant where appropriate. Never let one account's persisted data appear after another account signs in.
- Store metadata such as schema version, resource version, fetched-at time, expiry, and account scope with cached records.
- Define maximum record count or storage size and remove expired/obsolete records.
- Clear private cached state on logout, account switch, tenant switch, and relevant authorization changes.
- Do not assume HTTP `Cache-Control: no-store` clears or governs the Cache API. Explicitly exclude sensitive resources from application-managed caches and remove existing entries during policy changes.
- Use service workers only when their update lifecycle, cache allowlist, logout behavior, and version migration are understood and tested.

### Safe returning-visit pattern

For eligible non-sensitive data, render from a valid local snapshot, then revalidate in the background. Replace the snapshot only after receiving a valid response. If revalidation fails, keep the last known safe snapshot only when the feature's freshness contract permits it. Never present stale permissions, payment state, balances, or other critical values as confirmed current information.

## 7. HTTP and CDN caching rules

Set explicit policies for routes and responses rather than relying on browser or proxy heuristics.

Examples to adapt after reviewing the actual response:

```http
# Fingerprinted static asset
Cache-Control: public, max-age=31536000, immutable

# Public response suitable for shared caching
Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=60

# Private response that can be stored only by a private cache and must be revalidated
Cache-Control: private, no-cache

# Sensitive response that must not be stored by compliant HTTP caches
Cache-Control: no-store
```

Important distinctions:

- `no-store` tells compliant HTTP caches not to store the response.
- `private` prevents shared caches from storing the response but may still permit a browser's private cache.
- `no-cache` does not mean "do not store"; it requires validation before reuse.
- A cookie or `Set-Cookie` header does not automatically make a response safe from shared caching.
- Never mark a response influenced by session cookies or authorization headers as public unless it has been deliberately designed and reviewed for sharing.
- Define cache behavior for success responses, errors, redirects, authentication routes, and API routes.
- Ensure CDN, reverse proxy, framework, and origin cache keys agree about host, path normalization, query parameters, and representation-varying headers.
- Do not allow an unkeyed request header or parameter to influence a shared cacheable response.
- Maintain a tested, scoped purge mechanism for public CDN entries.

## 8. Security requirements beyond caching

### Authentication and authorization

- Enforce authentication and object-level authorization in the server-side data-access layer or operation itself.
- Verify authorization inside every API handler, server action, and mutation. Do not rely only on middleware, layout, or client-side route protection.
- Use least-privilege database roles and service credentials.
- Keep secrets server-side. Never expose private environment variables through client bundles, public configuration, logs, or error messages.
- If using Supabase, preserve and test Row Level Security policies. Do not replace RLS with assumptions based on hidden UI controls. Never expose the service-role key to the browser.
- Re-check access after ownership, role, membership, or tenant changes. Ensure cache invalidation cannot leave revoked data accessible.

### Input, API, and database safety

- Validate and normalize all client input on the server.
- Use parameterized database queries or safe query builders. Never concatenate untrusted input into SQL.
- Apply request size limits, pagination limits, and timeouts.
- Rate-limit authentication, expensive queries, uploads, search, and mutation endpoints according to risk.
- Protect cookie-authenticated mutations against CSRF using the application's framework-supported protections and appropriate cookie settings.
- Configure CORS narrowly. Do not use wildcard origins with credentials.
- Use safe output encoding and avoid rendering untrusted HTML.
- Restrict file uploads by size, type, content inspection, and storage permissions.

### Transport, headers, and operations

- Enforce HTTPS in production and configure secure cookies.
- Review Content Security Policy, HSTS, frame protections, MIME sniffing protections, and Referrer-Policy for the deployment.
- Keep dependencies and runtime images maintained. Scan for known vulnerabilities and remove unused packages.
- Do not return stack traces, secret values, internal hostnames, SQL details, or sensitive cache contents to clients.
- Redact credentials, session identifiers, personal data, and payment information from logs and traces.
- Restrict Redis network access and credentials. Use TLS where supported and least-privilege ACLs. Do not expose Redis publicly.
- Limit access to cache inspection, configuration, metrics, and purge operations.

## 9. Performance engineering checklist

Optimize the complete user journey, not only API response time.

### Rendering and network

- Prioritize useful first paint and Largest Contentful Paint (LCP).
- Minimize Interaction to Next Paint (INP) through smaller client bundles, less main-thread work, and responsive event handlers.
- Prevent Cumulative Layout Shift (CLS) with reserved image/media dimensions and stable loading states.
- Reduce Time to First Byte (TTFB) by removing unnecessary server hops, expensive uncached work, and serial upstream calls.
- Compress text responses with Brotli or gzip where supported.
- Serve static assets through a CDN with content-hashed filenames.
- Optimize images, responsive sizes, formats, and lazy loading. Do not lazy-load the main above-the-fold/LCP image without a reason.
- Use font subsetting, appropriate font-display behavior, and limited font weights.
- Split large components and dependencies. Avoid shipping server-only code to the browser.
- Avoid unnecessary hydration, repeated renders, large JSON payloads, and fetching data the screen does not use.

### Data access

- Fetch only the columns and records needed for the current screen.
- Add indexes based on measured query plans and actual filters/sorts.
- Use pagination for unbounded collections. Do not fetch an entire table to make the UI appear instant.
- Batch related reads when appropriate and avoid N+1 query patterns.
- Add request deduplication and cache only genuinely reusable results.
- Make expensive work asynchronous when it does not belong in the user's critical path.
- Set query timeouts and protect the database with concurrency limits.

### Next.js-specific guidance

- First identify the installed Next.js version and whether the project uses App Router or Pages Router.
- Follow the current documentation for that version. Caching defaults and APIs can change between releases.
- Prefer Server Components for server-side data work and keep `use client` boundaries as low and narrow as practical.
- Use streaming and Suspense boundaries for independent slow sections rather than blocking the entire route.
- Avoid calling an internal Route Handler from a Server Component when the server-side data layer can be called directly.
- Review prefetching, route rendering, data cache behavior, request-time APIs, and static asset delivery.
- Use the framework's supported revalidation mechanism after writes. Keep tag/path invalidation close to the mutation logic.
- Test in a production build, not only in the development server. Development caching and rendering behavior can differ.

## 10. Observability and measurable outcomes

Instrument the system so the team can see whether caching is helping and whether data is becoming stale.

Track at minimum:

- Redis hit, miss, bypass, error, eviction, and timeout rates.
- Cache hit ratio by resource class, not only one global number.
- Database query count, query duration, connection pool saturation, and slow queries.
- Backend request count per page load and per user journey.
- API p50, p95, and p99 latency, error rate, and payload size.
- Cache invalidation success rate and propagation delay.
- Stale-response age and stale-while-revalidate failures where applicable.
- Redis memory usage, key cardinality, evictions, CPU, and connection count.
- Core Web Vitals: LCP, INP, and CLS, plus TTFB and route-transition responsiveness.

Use request IDs and distributed traces to follow a request across the application, Redis, database, and external services. Avoid high-cardinality or personally identifiable metric labels.

Set budgets from a measured baseline and product requirements. Do not invent performance gains or promise a specific latency before testing.

## 11. Required test plan

A performance or caching change is incomplete until relevant tests pass.

### Correctness and freshness

- First request with an empty cache loads the authoritative data and populates the cache.
- Repeated requests hit the intended cache and reduce backend/database work.
- Expired entries are refreshed and cannot remain stale indefinitely.
- Successful create, update, delete, and visibility changes invalidate all dependent keys and views.
- Read-after-write behavior matches the resource's freshness contract.
- Failed database writes do not publish new cache state or invalidate data incorrectly.
- Missing records and negative-cache expiry behave correctly.

### Security and isolation

- Two users cannot read each other's cached private data.
- Two tenants cannot collide in Redis or browser storage.
- A role downgrade, membership removal, logout, or permission revocation blocks access immediately according to the documented security contract.
- Authorization is still enforced on cache hits.
- Sensitive routes return the intended `Cache-Control` policy.
- Tokens, session IDs, secrets, and sensitive fields do not appear in browser storage, cache keys, logs, or public bundles.
- Untrusted query parameters and headers cannot poison a shared cache entry.

### Reliability and load

- Concurrent misses for a hot key do not create an uncontrolled database spike.
- Redis timeout or outage follows the defined fallback/fail-safe behavior.
- Cache eviction, process restart, deployment, and cold start do not break correctness.
- Storage quota, IndexedDB migration, service-worker update, and offline recovery are handled where those features are used.
- Load tests compare backend calls, database load, p95 latency, and error rate before and after the change.

## 12. Implementation workflow

Follow this order for each task:

1. **Discover:** inspect the repository and existing infrastructure; identify versions and trust boundaries.
2. **Baseline:** reproduce the slow path and gather useful measurements or request/query traces.
3. **Classify:** map each data resource to its sensitivity, freshness contract, owner, and appropriate cache layer.
4. **Design:** define keys, TTLs, invalidation events, browser behavior, outage behavior, and monitoring before coding.
5. **Implement narrowly:** change the smallest set of modules needed. Reuse existing infrastructure and conventions.
6. **Secure:** verify authorization, tenant isolation, storage exclusions, cache headers, secret handling, and rate limits.
7. **Test:** run relevant unit, integration, security, production-build, and load tests.
8. **Measure:** compare the same user journey and workload against the baseline.
9. **Document:** record cache policy, freshness guarantees, invalidation dependencies, operational metrics, and rollback steps.

Do not perform a broad rewrite just to introduce a caching abstraction. Keep helpers small, typed, observable, and easy to remove or bypass.

## 13. Definition of done

A change is complete only when:

- The initial page shows meaningful critical content without waiting for unrelated data.
- Repeat visits reuse approved cached data rather than issuing avoidable backend calls.
- Cache misses and cache outages have defined, safe behavior.
- Every cached resource has an explicit TTL or lifecycle and invalidation strategy.
- Successful data changes refresh all affected views and caches within the documented freshness contract.
- Private and tenant-specific data cannot leak across users, tenants, or sessions.
- Sensitive data and credentials are excluded from unsafe storage locations.
- Authentication and authorization remain enforced on every protected server operation and cache hit.
- Production build and relevant automated tests pass.
- Before/after metrics demonstrate an improvement or explain why the proposed change was not beneficial.
- Operational and rollback guidance is documented.

## 14. Expected response when using this skill

When asked to optimize or implement, provide:

1. A concise diagnosis grounded in the inspected code.
2. The proposed request flow and cache layers, including what must not be cached.
3. The files and components that need changes.
4. The implementation with types, error handling, and comments where useful.
5. The invalidation and freshness strategy for every affected mutation.
6. Security checks and relevant tests.
7. Measured before/after results, or a clear statement of what could not be measured.
8. Any trade-offs, assumptions, or follow-up infrastructure requirements.

Never claim that Redis, browser storage, or a service worker has been configured unless the repository has actually been changed and the configuration has been verified.

## References

Use the documentation matching the project's installed versions and deployment platform:

- Next.js production checklist: https://nextjs.org/docs/app/guides/production-checklist
- Next.js caching guide (Cache Components): https://nextjs.org/docs/app/getting-started/caching
- Next.js caching guide (previous model, for apps not using Cache Components): https://nextjs.org/docs/app/guides/caching-without-cache-components
- Redis cache-aside pattern: https://redis.io/docs/latest/develop/use-cases/cache-aside/
- Redis cache prefetch pattern: https://redis.io/docs/latest/develop/use-cases/prefetch-cache/
- OWASP Web Cache Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Web_Cache_Security_Cheat_Sheet.html
- OWASP HTML5 Security Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
