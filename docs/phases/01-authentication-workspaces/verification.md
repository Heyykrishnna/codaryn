# Phase 1 verification record

The implementation covers GitHub sign-in, account profile updates, server-managed sessions, workspace creation, selection, renaming and deletion, invitations, membership removal, leaving, role changes and audit history. Configuration and security boundaries are described in [authentication.md](../../authentication.md).

| Acceptance area | Automated evidence | Remaining verification |
| --- | --- | --- |
| Workspace lifecycle | Real PostgreSQL service tests and authenticated Fastify injection cover creation, selection persistence, recipient-bound invitation acceptance, replay rejection and leaving | Signed-in browser interactions |
| Role enforcement | API tests reject member rename, permit admin rename, and apply owner-controlled role changes | Production deployment policy review |
| Tenant isolation | A separate authenticated account cannot read another workspace; unauthenticated requests receive 401 | Future repository endpoints do not exist yet and must have their own isolation tests |
| Session security | Real library sessions exercise HttpOnly cookies, logout revocation, database expiry, invalid OAuth state, CSRF rejection and auth throttling | Live GitHub callback, consent, HTTPS Secure cookies and ingress client-IP configuration |
| Audit | Workspace tests assert committed event records; identity session hooks persist safe audit events | Deployment log access, retention and monitoring |

The production auth configuration exposes GitHub only. The integration test enables email sign-up in a separately constructed test instance so tests can obtain real sessions without contacting GitHub. No test-login endpoint is mounted by the production server. Better Auth's schema migrator runs against the isolated database in these tests.

The live GitHub flow requires a configured OAuth application and credentials. No real provider credentials were supplied in this session. The anonymous sign-in view and unavailable-API view were inspected in the browser. This record does not claim signed-in browser, production or real repository testing has occurred.
