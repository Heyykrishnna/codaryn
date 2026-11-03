---
description: Design, implement, review, and harden production-grade
  authentication, session management, token handling, and authorization
  systems. Use when building login, signup, OAuth/OIDC, passkeys, MFA,
  cookies, JWTs, refresh tokens, RBAC/ABAC, account recovery, or
  access-control middleware.
name: production-authentication-authorization
---

# Production Authentication and Authorization Skill

## Mission

Build an authentication and authorization system that is secure by
default, maintainable, observable, testable, and appropriate to the
application's actual threat model. Prefer established standards and
mature identity providers over custom cryptography or a home-grown
identity protocol.

This skill is a set of implementation requirements, not permission to
blindly add every feature. First inspect the existing application, its
framework, deployment topology, client types, data model, and identity
provider. Preserve existing conventions where safe. Explain trade-offs
and identify assumptions before making architecture-changing decisions.

## 1. Core principles

-   Authentication answers **who is the user?** Authorization answers
    **what may this identity do to this resource, in this context?**
-   Enforce authorization on the server for every protected operation.
    Hiding a button or route in the UI is not access control.
-   Deny by default. Grant the minimum permissions needed, for the
    minimum time, to the minimum set of resources.
-   Use TLS everywhere. Never send credentials or bearer tokens over
    plaintext HTTP.
-   Prefer a managed, standards-compliant identity provider (IdP) for
    complex federation, enterprise SSO, MFA, passkeys, and lifecycle
    management unless there is a justified requirement to own the
    identity plane.
-   Do not invent cryptographic protocols, token formats, password
    hashing, or recovery schemes.
-   Keep authentication, authorization, business logic, and presentation
    concerns separate.
-   Treat all credentials, session identifiers, reset links,
    authorization codes, and tokens as secrets.
-   Make security controls consistent across web, mobile, APIs,
    background workers, and administrative interfaces.
-   Record security-relevant events without logging secrets or
    unnecessary personal data.

## 2. Start with discovery

Before coding, determine:

1.  Client types: server-rendered web, SPA, mobile, desktop, API
    clients, service-to-service, or a combination.
2.  Backend framework, frontend framework, database, cache/session
    store, deployment platform, reverse proxy, and domain topology.
3.  Whether an existing IdP is used, and its supported OIDC/OAuth
    features.
4.  Whether the application is single-tenant or multi-tenant.
5.  User types and trust boundaries: anonymous, member, staff,
    administrator, support, service account.
6.  Data sensitivity, regulatory requirements, expected scale,
    availability requirements, and threat model.
7.  Existing login/session behavior and migration constraints.

Do not assume that JWT is automatically better than a server-side
session. Do not introduce OAuth/OIDC if the application only needs a
simple first-party session and has no federation or delegated
authorization requirement.

## 3. Recommended architecture

### 3.1 First-party browser application

For a conventional web application, prefer a **server-managed session**
or a **Backend-for-Frontend (BFF)**:

-   Browser receives an opaque, unpredictable session cookie.
-   Session state is stored server-side in a durable shared store when
    multiple instances are deployed.
-   Server validates the session on each request and loads current
    identity and authorization context.
-   Browser JavaScript cannot read the session cookie (`HttpOnly`).
-   Session can be revoked immediately by deleting or invalidating its
    server-side record.
-   Do not expose refresh tokens or long-lived bearer credentials to
    browser JavaScript.

This is generally simpler to revoke and safer than storing long-lived
JWTs in browser storage.

### 3.2 APIs and distributed services

Use OAuth 2.0 / OpenID Connect where federation, delegated access,
multiple clients, or independently deployed resource servers require it.

-   OIDC is the identity layer used for user authentication.
-   OAuth 2.0 is an authorization framework for delegated access. OAuth
    alone is not a login protocol.
-   Use Authorization Code Flow with PKCE (`S256`) for interactive
    public clients.
-   Use exact pre-registered redirect URI matching.
-   Validate `state` and, for OIDC, `nonce`.
-   Validate issuer, audience, signature, expiry, and relevant claims.
-   Use access tokens only at the intended resource server.
-   Keep scopes and audiences as narrow as practical.
-   Never use the Implicit grant or Resource Owner Password Credentials
    grant.
-   Never put access tokens, refresh tokens, authorization codes, or
    secrets in URLs.
-   For high-risk service-to-service environments, evaluate mTLS or DPoP
    sender-constrained tokens.

### 3.3 Token formats

Choose the format based on operational needs:

-   Opaque access tokens are often preferable when centralized
    introspection and immediate revocation are important.
-   Signed JWT access tokens are useful when resource servers need local
    verification and can tolerate bounded revocation delay.
-   A JWT is signed, not necessarily encrypted. Its header and payload
    are readable by anyone holding it. Never put passwords, secrets,
    sensitive personal data, or confidential business data in a JWT.
-   Do not use an ID token as an API access token.
-   Do not accept a token merely because its signature is valid.

For JWT validation, explicitly allowlist algorithms and validate: -
Signature using trusted issuer keys and correct key selection. - `iss`
exact expected issuer. - `aud` includes the intended API/resource
server. - `exp` and, where applicable, `nbf`. - `iat` sanity and maximum
token age where policy requires it. - `sub` is present and maps to a
valid identity. - `jti` where token replay/revocation tracking is
implemented. - Required scopes/permissions and tenant/resource
context. - Token type and intended use to prevent cross-JWT confusion.

Reject `alg: none`, algorithm confusion, unknown issuers, unexpected
audiences, malformed tokens, and expired tokens. Rotate signing keys
using a documented key lifecycle and publish/consume JWKS safely with
bounded caching and key rollover handling.

## 4. Sessions and cookies

### 4.1 Cookie defaults

For a first-party browser session, use a cookie similar to:

``` http
Set-Cookie: __Host-session=<opaque-random-value>; Path=/; Secure; HttpOnly; SameSite=Lax
```

Requirements:

-   `Secure`: only transmit over HTTPS.
-   `HttpOnly`: prevent JavaScript access.
-   `SameSite=Lax` as a practical default for many first-party
    applications; use `Strict` when compatible with navigation and
    product behavior.
-   Use `SameSite=None; Secure` only when cross-site cookie behavior is
    genuinely required, and add robust CSRF defenses.
-   Prefer the `__Host-` prefix where possible: it requires `Secure`,
    `Path=/`, and no `Domain` attribute.
-   Do not set a broad `Domain` attribute unless cross-subdomain sharing
    is an explicit, reviewed requirement.
-   Do not put session identifiers in localStorage, sessionStorage,
    IndexedDB, URLs, or DOM-accessible application state.
-   Set explicit cookie lifetime and server-side expiry. Cookie expiry
    alone is not session revocation.
-   Avoid persistent "remember me" sessions by default. If required,
    implement them as separately revocable, rotated persistent
    credentials.

### 4.2 Session lifecycle

-   Generate session identifiers with a cryptographically secure random
    number generator and at least 128 bits of entropy; 256 bits is a
    sensible default.
-   Treat the cookie value as a bearer secret.
-   Store a one-way verifier/hash of the session secret server-side
    where practical, not a reusable plaintext cookie value.
-   Regenerate the session identifier after login, MFA completion,
    privilege elevation, and other trust-level changes to prevent
    session fixation.
-   Enforce idle and absolute session timeouts appropriate to risk.
-   Revoke sessions on logout, account disablement, password reset where
    policy requires, suspected compromise, and administrative
    termination.
-   Support "log out all devices" and per-device/session management.
-   Track creation time, last activity, user, device label, IP/risk
    metadata where justified, authentication strength, and revocation
    status. Do not over-collect fingerprinting data.
-   Avoid relying on IP address as the sole session binding because
    mobile networks and privacy relays change addresses.
-   In distributed deployments, use a shared session store with atomic
    updates and clear TTL behavior.
-   Fail closed for high-risk operations if session validation
    infrastructure is unavailable. Define availability behavior
    deliberately.

### 4.3 CSRF

Cookie-based authentication requires CSRF protection for state-changing
operations.

-   Use framework-supported CSRF middleware and synchronizer tokens or a
    correctly implemented double-submit pattern.
-   Validate `Origin` and, where appropriate, `Referer` as defense in
    depth.
-   SameSite cookies are defense in depth, not a universal replacement
    for CSRF tokens.
-   Never perform state-changing actions through GET.
-   Protect login, logout, account linking, email changes, password
    changes, and payment/security-sensitive actions against CSRF.
-   CORS is not a CSRF defense.
-   Configure CORS with explicit trusted origins. Never combine
    credentialed requests with wildcard origins.

## 5. Access tokens and refresh tokens

### 5.1 Access tokens

-   Keep access tokens short-lived. A common starting point is 5--15
    minutes, adjusted to risk, infrastructure, and user experience.
-   Use narrow scopes and a specific audience.
-   Do not put long-lived access tokens in browser storage.
-   Do not log tokens, return them in error messages, or expose them to
    analytics.
-   Send bearer access tokens in the `Authorization: Bearer` header for
    API clients, not query parameters.
-   Validate each token at every resource server boundary.
-   Use introspection or a revocation strategy for operations requiring
    rapid invalidation.
-   Consider DPoP or mTLS where token theft/replay risk justifies the
    added complexity.

### 5.2 Refresh tokens

Refresh tokens are high-value credentials. Treat them as long-lived
secrets.

-   Issue refresh tokens only when the client and use case require them.
-   For public clients, use refresh-token rotation or sender-constrained
    refresh tokens as required by OAuth Security BCP.
-   On every successful refresh, atomically invalidate the previous
    refresh token and issue a new one.
-   Persist only a cryptographic hash/verifier of opaque refresh tokens,
    not the raw secret.
-   Store token family/grant identifiers, client binding, user, scopes,
    audience/resource, creation time, expiry, last-used time, and
    revocation state.
-   Detect reuse of an already-rotated token. Treat it as possible
    theft: revoke the active token family/grant, invalidate sessions as
    appropriate, and require re-authentication.
-   Handle concurrent refresh requests safely. Use
    transactions/compare-and-swap or equivalent atomic semantics so
    parallel requests do not create inconsistent token families.
-   Apply both absolute and inactivity expiration.
-   Revoke refresh tokens on logout, account compromise, user
    disablement, password/security changes according to policy, and
    consent withdrawal.
-   Never silently expand scopes or audiences during refresh.
-   Never store refresh tokens in localStorage or sessionStorage.
-   For browser applications, prefer BFF-managed refresh tokens and an
    HttpOnly session cookie rather than exposing refresh tokens to
    JavaScript.

### 5.3 Rotation and key management

-   Use vetted cryptographic libraries and managed KMS/HSM where
    appropriate.
-   Keep signing keys, client secrets, database credentials, and
    encryption keys out of source control and frontend bundles.
-   Separate development, staging, and production secrets.
-   Support key rotation with overlapping verification windows and a
    documented rollback plan.
-   Use a key identifier (`kid`) and trusted JWKS for asymmetric JWT
    signing.
-   Never fetch arbitrary key URLs supplied by an untrusted token
    header.
-   Ensure backups, logs, traces, crash dumps, and analytics do not leak
    credentials.

## 6. Password authentication

Prefer passkeys where feasible, but if passwords are supported:

-   Store only salted password hashes using Argon2id with parameters
    tuned to the production environment. Use scrypt or bcrypt where
    Argon2id is unavailable and follow current library guidance.
-   Never use plaintext, reversible encryption, MD5, SHA-1, or a fast
    general-purpose hash such as plain SHA-256 for password storage.
-   Use a unique salt per password. A vetted password-hashing library
    should manage salts and parameters.
-   Consider a server-side pepper stored separately in a secrets
    manager, with a rotation plan and documented recovery implications.
-   Compare password hashes using vetted constant-time verification
    functions.
-   Allow long passwords and passphrases. Set a generous maximum input
    length to prevent denial of service.
-   Do not impose arbitrary composition rules or periodic forced changes
    without evidence of compromise or policy requirement.
-   Check new passwords against known compromised/common password lists
    without sending plaintext passwords to third parties.
-   Do not truncate passwords silently.
-   Normalize input only according to a documented, consistent policy.
    Never unexpectedly transform passwords.
-   Use generic login errors that do not reveal whether an account
    exists.
-   Rate-limit login and password reset attempts. Use progressive delays
    and risk-based challenges without making denial of service easy.
-   Rehash passwords on successful login when hashing parameters become
    outdated.
-   Require recent re-authentication for changing password, email, MFA,
    recovery methods, or other critical account settings.

## 7. Passkeys and WebAuthn

Support WebAuthn/passkeys as a preferred phishing-resistant
authentication option when platform support and product needs allow.

Registration: - Require an authenticated session and recent
re-authentication or MFA for adding a credential. - Generate a fresh,
cryptographically random, single-use challenge with short expiry. -
Validate challenge, expected origin, RP ID, credential type, and
attestation policy. - Enforce user verification where the application's
assurance policy requires it. - Store credential ID, public key,
signature counter where meaningful, transports, backup eligibility/state
where supported, creation time, and user-friendly device label. - Never
store the private key. It remains with the authenticator.

Authentication: - Generate and store a single-use challenge bound to the
authentication ceremony. - Validate challenge, origin, RP ID hash,
signature, credential ownership, user presence, and required user
verification. - Reject replayed, expired, mismatched, or invalid
assertions. - Handle synced passkeys and authenticators with
non-monotonic signature counters correctly; do not treat a zero or
non-incrementing counter as universally conclusive compromise
evidence. - Provide secure recovery and credential removal flows. -
Notify users when a passkey is added or removed.

Do not claim that biometrics are sent to the server. WebAuthn normally
uses local user verification and public-key cryptography.

## 8. MFA and step-up authentication

Offer MFA based on risk and sensitivity:

-   Prefer WebAuthn/passkeys or hardware security keys for phishing
    resistance.
-   TOTP authenticator apps are a useful fallback. Encrypt TOTP shared
    secrets at rest with managed keys; never log or expose them.
-   Email OTP is a lower-assurance recovery or verification channel, not
    strong MFA by itself.
-   SMS OTP is vulnerable to SIM swapping and interception. Avoid it as
    the primary high-assurance factor; if retained for accessibility or
    recovery, document the risk and provide stronger alternatives.
-   Generate cryptographically random OTPs, use short expiry, bind them
    to a specific purpose and transaction, enforce one-time use, and
    rate-limit verification.
-   Never accept the same OTP twice.
-   Prevent OTP brute force with attempt limits and cooldowns.
-   Require step-up authentication for high-risk actions such as
    changing email/password/MFA, exporting sensitive data, managing
    billing, changing ownership, or granting administrator privileges.
-   Use phishing-resistant MFA for privileged accounts wherever
    possible.
-   Provide recovery codes generated with a CSPRNG, shown once, stored
    hashed, single-use, and revocable/regenerable.
-   Avoid security questions as an authentication or recovery factor.

## 9. OAuth 2.0, OIDC, SSO, and account linking

-   Use Authorization Code Flow with PKCE (`S256`) for interactive
    clients.
-   Use OIDC for authentication and validate the ID token according to
    OIDC Core.
-   Validate `state`, `nonce`, issuer, audience, signature, expiry, and
    authorized party (`azp`) when applicable.
-   Match redirect URIs exactly. Do not accept arbitrary redirect
    destinations.
-   Use the system browser for native OAuth flows, not embedded
    webviews, unless a platform-specific standard explicitly requires
    otherwise.
-   Use client secrets only in confidential server-side clients. A
    secret embedded in a SPA or mobile binary is not secret.
-   Use provider discovery and JWKS only from a trusted, configured
    issuer.
-   Validate email verification status from the provider before treating
    an email claim as verified.
-   Link external identities by stable provider subject (`iss` + `sub`),
    not email address alone.
-   Require the user to authenticate to the existing account before
    linking another provider.
-   Protect unlinking so the user cannot remove their only viable
    authentication method without adding another.
-   Handle provider errors, denial, account collisions, and callback
    replay safely.
-   Request minimum scopes and explain consent.
-   Support SSO logout behavior explicitly; local logout does not
    necessarily terminate the IdP session.
-   For enterprise SSO, validate tenant/domain association and enforce
    organization-specific policy. Do not trust an email domain alone as
    proof of organization membership.

## 10. Authorization architecture

### 10.1 Authorization model

Use a layered model:

-   **RBAC** for coarse organizational roles such as `member`, `editor`,
    `support`, and `admin`.
-   **Permissions/scopes** for explicit actions such as `invoice:read`,
    `project:update`, or `user:invite`.
-   **ABAC/ReBAC** when decisions depend on attributes and
    relationships, such as ownership, organization membership, resource
    state, or delegated access.

Do not rely on role names alone for sensitive decisions. Keep
permissions explicit and testable.

### 10.2 Enforcement

-   Enforce authorization in backend services, API handlers, GraphQL
    resolvers, server actions, background jobs, and data access
    boundaries.
-   Check both action permission and resource-level access
    (ownership/tenant/relationship).
-   Scope database queries by tenant and authorized resource
    identifiers. Avoid fetching globally and filtering only in the
    frontend.
-   Prevent insecure direct object reference (IDOR/BOLA) by checking
    access to the specific object on every request.
-   Do not trust user-supplied `role`, `userId`, `tenantId`, `ownerId`,
    or permission claims without server-side validation.
-   Avoid client-controlled role assignment and mass assignment.
-   Ensure administrators and support staff have explicit, audited,
    least-privilege permissions.
-   Use deny-by-default policies and fail closed when policy evaluation
    fails.
-   Keep authorization logic centralized or consistently shared. Avoid
    duplicated, drifting permission checks.
-   Re-evaluate permissions for sensitive operations instead of relying
    indefinitely on stale claims embedded in long-lived tokens.

### 10.3 Multi-tenancy

-   Resolve tenant context from a trusted membership/session/domain
    mapping, not an arbitrary request body field.
-   Include tenant boundaries in every relevant query and mutation.
-   Enforce tenant isolation at the database layer where possible (for
    example, row-level security with carefully scoped database roles).
-   Test cross-tenant reads, writes, exports, search, background jobs,
    caches, file storage, and realtime subscriptions.
-   Never assume globally unique IDs alone provide tenant authorization.
-   Prevent cache keys and object storage paths from crossing tenant
    boundaries.

### 10.4 Policy examples

``` text
Can user U perform action A on resource R?

1. Is U authenticated and active?
2. Is U a member of the tenant that owns R?
3. Does U have the permission for A?
4. Does the relationship/ownership policy allow access to R?
5. Does the resource state permit A?
6. Is additional step-up authentication required?
7. If any required check fails or cannot be evaluated, deny.
```

## 11. Account lifecycle and recovery

Implement secure flows for:

-   Registration and email/phone verification.
-   Login and logout.
-   Password change and reset.
-   Email/phone change.
-   MFA/passkey enrollment, removal, and recovery.
-   Session/device listing and revocation.
-   Account disablement, deletion, and reactivation.
-   Invitation acceptance and organization membership changes.
-   Suspicious-login notification and account compromise response.

Password reset: - Use high-entropy, single-use, short-lived random
tokens. - Store only token hashes/verifiers. - Bind token purpose to
password reset and the intended account. - Return generic responses to
prevent account enumeration. - Rate-limit requests and redemption. - Do
not change the password through a GET request. - After reset, revoke
existing sessions and refresh-token families according to policy. -
Notify the account owner. - Do not automatically log the user in after a
reset unless the risk has been assessed and the session is newly
established safely.

Email change: - Require recent authentication and verification of the
new address. - Notify the old address when possible. - Consider a
confirmation step or delay for high-risk accounts. - Do not treat a
changed email as proof of identity without verification.

Recovery must not be weaker than the authentication it is meant to
recover. Provide recovery codes or verified alternative authenticators,
and apply additional review for privileged accounts.

## 12. Abuse prevention and application security

-   Rate-limit by account identifier, IP/network signals,
    device/session, and endpoint as appropriate. Avoid IP-only controls.
-   Use progressive throttling, abuse detection, and CAPTCHA/challenges
    only when risk warrants them.
-   Prevent user enumeration through consistent responses and
    timing-aware design.
-   Protect against credential stuffing, brute force, password spraying,
    OTP guessing, session fixation, session hijacking, replay, CSRF,
    XSS, clickjacking, open redirects, SSRF in federation integrations,
    and IDOR/BOLA.
-   Use secure headers, including a well-designed Content Security
    Policy, HSTS, `frame-ancestors`, and appropriate MIME sniffing
    protections.
-   Validate input server-side and use parameterized database queries.
-   Keep dependencies patched and scan for known vulnerabilities.
-   Set request body, payload, and authentication endpoint limits.
-   Use TLS and secure reverse-proxy configuration. Trust forwarded
    headers only from known proxies.
-   Avoid leaking account existence or security state through detailed
    error messages.
-   Use generic external errors with detailed, redacted internal
    diagnostics.

## 13. Data model reference

Adapt names and fields to the existing database. Do not create redundant
tables if the IdP already owns the relevant records.

Typical entities:

### users

-   `id` (stable, immutable primary key)
-   `status` (`pending`, `active`, `suspended`, `disabled`, `deleted`)
-   `created_at`, `updated_at`, `deleted_at`
-   Profile data separated from credentials where practical.

### credentials

-   `id`, `user_id`, `type`
-   `password_hash` (nullable)
-   `created_at`, `last_used_at`, `revoked_at`
-   Provider credentials/passkey metadata as appropriate.
-   Never store raw passwords or private WebAuthn keys.

### sessions

-   `id` or public lookup identifier
-   `user_id`
-   `secret_hash` or token verifier
-   `created_at`, `last_seen_at`, `idle_expires_at`,
    `absolute_expires_at`
-   `revoked_at`, `revocation_reason`
-   Minimal device metadata and authentication assurance context.

### refresh_tokens

-   `id`, `family_id`, `user_id`, `client_id`
-   `token_hash`
-   `scopes`, `audiences/resources`
-   `issued_at`, `expires_at`, `last_used_at`, `revoked_at`
-   `replaced_by_id` or equivalent rotation lineage
-   Reuse detection and family revocation metadata.

### external_identities

-   `id`, `user_id`, `issuer`, `subject`
-   `provider`, `created_at`, `last_login_at`
-   Unique constraint on (`issuer`, `subject`).

### roles, permissions, role_permissions, user_roles

-   Explicit role and permission mapping.
-   Include tenant/organization scope where applicable.
-   Prevent client-side privilege mutation.

### organizations and memberships

-   `organization_id`, `user_id`, membership status, role, timestamps.
-   Enforce uniqueness and tenant-scoped authorization.

### audit_events

-   Actor, action, target, outcome, timestamp, correlation ID, and safe
    contextual metadata.
-   Never include passwords, raw tokens, OTPs, reset URLs, authorization
    codes, or secrets.

Use foreign keys, unique constraints, indexes, transaction boundaries,
and deletion/retention policies appropriate to the chosen database.

## 14. API and endpoint design

Use consistent semantics and avoid leaking internal details. A typical
first-party API may include:

``` text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/logout-all
GET    /auth/session
POST   /auth/refresh                 # only where token architecture requires it
POST   /auth/verify-email
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/change-password
GET    /auth/sessions
DELETE /auth/sessions/{sessionId}
POST   /auth/mfa/enroll
POST   /auth/mfa/verify
POST   /auth/mfa/disable
POST   /auth/passkeys/registration/options
POST   /auth/passkeys/registration/verify
POST   /auth/passkeys/authentication/options
POST   /auth/passkeys/authentication/verify
GET    /users/me
```

These are illustrative, not mandatory routes. Follow the framework and
IdP conventions. Ensure all state-changing endpoints have CSRF
protection when cookie authenticated, validation, rate limits, and audit
coverage.

Use appropriate status codes without disclosing sensitive account state.
Return a consistent error envelope with a safe public message and
correlation/request ID. Never include stack traces, SQL errors, token
contents, or secrets.

## 15. Frontend requirements

-   Treat the backend as the source of truth for authentication and
    authorization.
-   Do not infer authenticated state solely from a decoded JWT or
    client-side flag.
-   Load the current session/user from a trusted server endpoint.
-   Handle loading, unauthenticated, forbidden, expired-session, and
    network-error states distinctly.
-   Clear sensitive in-memory state on logout and account switching.
-   Do not persist bearer tokens in browser storage.
-   Do not put credentials or tokens in URLs, analytics, logs, error
    trackers, or client-side telemetry.
-   Protect authenticated pages for user experience, but still enforce
    all access checks on the server.
-   Avoid leaking protected data in server-rendered HTML, hydration
    payloads, prefetch caches, or shared CDN caches.
-   Make logout invalidate the server-side session, not just navigate to
    a login page.
-   Avoid redirect loops and validate post-login return destinations
    against an allowlist or same-origin policy.

## 16. Logging, monitoring, and audit

Record security events such as:

-   Login success/failure and logout.
-   MFA/passkey enrollment, challenge failure, removal, and recovery.
-   Password reset/change and email change.
-   Session creation, revocation, expiry, and refresh-token reuse.
-   Role/permission changes and privileged actions.
-   Account lock, suspension, recovery, and administrative access.
-   OAuth linking/unlinking and suspicious callback failures.

Logs must: - Exclude passwords, cookies, authorization headers,
access/refresh tokens, OTPs, reset tokens, authorization codes, private
keys, and secrets. - Use stable event names, timestamps,
request/correlation IDs, actor and target IDs where appropriate, and
outcome. - Restrict access, protect integrity, and define retention. -
Avoid storing unnecessary full IP addresses or device fingerprints. -
Alert on anomalous patterns such as refresh-token reuse, repeated MFA
failures, privilege escalation, mass session revocation, and unusual
administrative activity.

## 17. Testing requirements

Do not consider authentication complete until automated tests cover:

### Unit tests

-   Password hashing and verification.
-   Token generation, hashing, expiry, and rotation.
-   Permission/policy decisions.
-   Session expiry and revocation.
-   OAuth state/nonce validation.
-   WebAuthn challenge validation.

### Integration tests

-   Register, verify, login, logout, and logout-all.
-   Session renewal and expiration.
-   Refresh-token rotation, replay detection, and concurrent refresh.
-   Password reset single-use and expiry.
-   MFA enrollment, verification, recovery, and throttling.
-   OAuth callback success, denial, invalid state, invalid nonce, and
    invalid issuer/audience.
-   User disablement and session invalidation.
-   Role changes and permission updates.
-   Tenant isolation across every resource path.

### Security tests

-   Unauthenticated access to protected routes.
-   Horizontal and vertical privilege escalation.
-   IDOR/BOLA and cross-tenant access.
-   CSRF against all cookie-authenticated mutations.
-   XSS impact assessment and cookie `HttpOnly` verification.
-   Session fixation and identifier rotation.
-   Replay of expired, revoked, or rotated credentials.
-   Brute force and rate-limit behavior.
-   Open redirect and redirect URI bypass.
-   JWT algorithm confusion, wrong issuer/audience, expired token, and
    key rotation.
-   Cache leakage of authenticated responses.
-   Race conditions in refresh, password reset, and one-time challenge
    consumption.

Test both allow and deny paths. Include regression tests for every
discovered authorization vulnerability.

## 18. Operational requirements

-   Use environment-specific secrets and a secrets manager.
-   Use HTTPS-only production cookies and HSTS after confirming
    deployment readiness.
-   Keep auth/session stores highly available, monitored, backed up, and
    access-controlled.
-   Define behavior for IdP, database, cache, and key-management
    outages.
-   Make revocation propagation and cache invalidation explicit.
-   Use secure migrations and backward-compatible rollout plans.
-   Ensure time synchronization for token expiry, TOTP, and challenge
    validation.
-   Have incident procedures for signing-key compromise, refresh-token
    theft, mass session revocation, and IdP compromise.
-   Do not deploy default credentials, debug auth routes, test bypasses,
    or permissive CORS settings.
-   Separate machine identities from human user accounts. Use workload
    identity or short-lived service credentials instead of shared static
    passwords where supported.

## 19. Implementation workflow for an AI coding agent

When asked to implement or modify authentication:

1.  Inspect the repository, framework, routing, database schema,
    existing auth provider, middleware, environment configuration, and
    tests.
2.  Map the current login/session/token lifecycle. Identify what is
    already implemented and what is missing.
3.  Write a concise architecture decision: session-based or token-based,
    browser/BFF/API client flows, IdP choice, authorization model, and
    threat assumptions.
4.  Identify security-critical gaps and migration risks before changing
    behavior.
5.  Implement the smallest coherent vertical slice. Do not create
    duplicate auth systems or parallel user tables without a migration
    plan.
6.  Add schema constraints and migrations before depending on new
    fields.
7.  Implement server-side validation, authorization, session/token
    lifecycle, CSRF, rate limiting, and audit events.
8.  Implement frontend integration without exposing secrets.
9.  Add unit, integration, authorization, and security regression tests.
10. Run formatter, linter, type checker, tests, migration checks, and
    build. Report commands and actual results. Never claim tests passed
    if they were not run.
11. Review diffs for secret leakage, insecure defaults, missing deny
    checks, and accidental public endpoints.
12. Document environment variables, provider configuration, callback
    URLs, cookie domain/scope, key rotation, migrations, and local
    development setup.

Do not silently weaken security to make a test pass. If a requirement
conflicts with the current framework or provider, explain the conflict
and propose a secure alternative.

## 20. Definition of done

A production authentication implementation is not complete until:

-   [ ] Authentication and authorization responsibilities are separated.
-   [ ] Server-side authorization protects every sensitive operation and
    resource.
-   [ ] Session or token architecture is documented and justified.
-   [ ] Cookies use appropriate `Secure`, `HttpOnly`, `SameSite`,
    `Path`, and domain settings.
-   [ ] CSRF protection covers cookie-authenticated state changes.
-   [ ] No credentials or tokens are stored in browser local/session
    storage.
-   [ ] Passwords use a modern adaptive password hash.
-   [ ] Access tokens are short-lived, scoped, audience-restricted, and
    correctly validated where used.
-   [ ] Refresh tokens are protected, rotated or sender-constrained,
    replay-detected, and revocable.
-   [ ] Logout and account security events invalidate the appropriate
    credentials.
-   [ ] OAuth/OIDC flows use PKCE, state, nonce, exact redirects, and
    strict validation.
-   [ ] MFA/passkeys and secure recovery are implemented according to
    the product's risk.
-   [ ] RBAC/permissions and resource/tenant isolation are enforced on
    the server.
-   [ ] Rate limits and abuse controls cover authentication and recovery
    endpoints.
-   [ ] Logs and telemetry contain no secrets.
-   [ ] Security, negative-path, concurrency, and tenant-isolation tests
    pass.
-   [ ] Key/secrets rotation, monitoring, incident response, and
    deployment settings are documented.

## 21. Common anti-patterns to reject

-   Storing JWTs or refresh tokens in `localStorage` or
    `sessionStorage`.
-   Treating JWT payloads as encrypted or trustworthy without signature
    and claim validation.
-   Using a long-lived JWT as the only session mechanism for a
    first-party browser app without a revocation design.
-   Using one token for every API, audience, tenant, and privilege.
-   Refreshing tokens without rotation/replay detection for public
    clients.
-   Accepting `alg: none`, trusting token-provided key URLs, or skipping
    issuer/audience checks.
-   Using OAuth Implicit or password grants.
-   Treating OAuth as authentication instead of using OIDC.
-   Using email address as the only external identity key.
-   Relying on frontend route guards or hidden UI for authorization.
-   Checking a user's role but not checking ownership/tenant/resource
    access.
-   Trusting client-provided user IDs, roles, tenant IDs, or permission
    arrays.
-   Using wildcard CORS with credentials.
-   Assuming SameSite alone solves every CSRF scenario.
-   Logging request headers, cookies, OTPs, or token values.
-   Building custom cryptography or password hashing.
-   Making account recovery weaker than normal login.
-   Shipping a privileged admin account or test bypass in production.

## 22. Standards and authoritative references

Use current versions and check for updates before implementation:

-   [OAuth 2.0 Security Best Current Practice, RFC
    9700](https://www.rfc-editor.org/rfc/rfc9700)
-   [OAuth 2.0 Authorization Framework, RFC
    6749](https://www.rfc-editor.org/rfc/rfc6749)
-   [OpenID Connect Core
    1.0](https://openid.net/specs/openid-connect-core-1_0.html)
-   [PKCE, RFC 7636](https://www.rfc-editor.org/rfc/rfc7636)
-   [JWT, RFC 7519](https://www.rfc-editor.org/rfc/rfc7519)
-   [JSON Web Key, RFC 7517](https://www.rfc-editor.org/rfc/rfc7517)
-   [DPoP, RFC 9449](https://www.rfc-editor.org/rfc/rfc9449)
-   [Web Authentication (WebAuthn),
    W3C](https://www.w3.org/TR/webauthn-3/)
-   [NIST SP 800-63B-4: Authentication and Authenticator
    Management](https://pages.nist.gov/800-63-4/sp800-63b.html)
-   [OWASP Authentication Cheat
    Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
-   [OWASP Session Management Cheat
    Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
-   [OWASP Password Storage Cheat
    Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
-   [OWASP CSRF Prevention Cheat
    Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
-   [OWASP Authorization Cheat
    Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

## Final instruction

Choose the simplest architecture that satisfies the application's real
requirements and threat model. For a first-party browser application,
start with secure server-side sessions and HttpOnly cookies. Add
OAuth/OIDC, JWT access tokens, refresh-token rotation, passkeys, MFA,
and advanced authorization only where the client topology, federation,
scale, or risk requires them. Security comes from correct end-to-end
lifecycle handling and server-side enforcement, not from accumulating
authentication features.
