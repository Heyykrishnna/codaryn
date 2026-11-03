# Authentication and workspace operations

Phase 1 uses Better Auth 1.7.15 for GitHub OAuth and opaque, server-managed sessions. The Fastify API owns authentication and PostgreSQL persistence; Next.js proxies `/api/auth/*` and `/api/v1/workspace/*` so browser requests remain on one origin. Password sign-up is enabled only in an isolated test instance, never in the production configuration.

## Setup

Copy `.env.example` to `.env` and fill values locally. Generate `AUTH_SECRET` with `openssl rand -base64 48`. Keep it stable and outside source control. Configure a GitHub OAuth application with the public website origin as its homepage and `{AUTH_BASE_URL}/api/auth/callback/github` as its callback URL. For the default local website this is `http://localhost:3000/api/auth/callback/github`. Use the same origin consistently; localhost and 127.0.0.1 are different origins.

Set `AUTH_BASE_URL` and `WEB_ORIGIN` to that public origin, `API_URL` to the internal Fastify URL, and `DATABASE_URL` to PostgreSQL. Production requires HTTPS. GitHub login requires the application's real client ID and secret. The OAuth application is separate from the repository-access GitHub App planned for Phase 2; no repository scope is requested here.

Export the variables in the shell running each command. The applications do not automatically load the root `.env` file. For a locally owned `.env`, use `set -a`, `. ./.env`, then `set +a` in a POSIX shell.

Run `docker compose up -d --wait`, `pnpm install --frozen-lockfile`, `pnpm db:migrate`, and `pnpm --filter @codaryn/api auth:migrate`. The first migration command manages application tables with checksums and a transaction lock. The second uses Better Auth's official migration API for its user, session, account, verification and rate-limit tables; review changes and back up production data before library upgrades. Then run `pnpm build` and start the API and web app with their `dev` scripts. Shared dependencies must be built before using package-specific development commands.

## Permissions and lifecycle

Workspace creation grants the creator the owner role. Owners can rename, delete, invite members or admins, and change or remove non-owner memberships. Admins can rename and invite members. Members can read their workspace and leave it. An owner cannot leave or be demoted; deleting the workspace is the supported owner exit path in this release. Ownership transfer is not provided.

Invitations target an existing account ID, visible on the recipient's account panel. Invitations appear in that recipient's workspace screen, expire after seven days and can be accepted once. No email delivery service is required. Existing memberships are not escalated by accepting another invitation. Membership administration is serialized on the workspace row; deleted workspaces cannot accept invitations. Deletion removes access and pending invitations while retaining the workspace and audit history as a soft deletion. There is no restore UI.

Workspace lists are bounded to 50 items in the current screen. Members, invitations and recent audit history are bounded to 100 entries per query. Larger-team pagination is not provided in this initial release. Workspace selection is persisted per user and revalidated against current membership. No repository data exists yet; Phase 2 repository routes must enforce these same membership boundaries.

## Security and operations

The API validates the session on every protected request and does not cache authenticated results. Browser JavaScript never receives provider tokens. OAuth tokens are encrypted by Better Auth using the configured secret; account linking is disabled. Production cookies are Secure, HttpOnly and SameSite; loopback HTTP is only for local development. Sessions have an absolute eight-hour lifetime without sliding refresh; role changes and deletion require a session created within the past hour. Sessions have no browser session cache, and are revoked on logout. Production startup rejects a non-HTTPS public origin.

Better Auth handles OAuth state, provider identity and auth-route origin validation. Workspace mutations require both the exact configured Origin and a custom request header. Cross-origin CORS access is not enabled. Rate limiting is persisted in PostgreSQL and enabled for authentication endpoints. The API supplies the client address rather than trusting a caller-supplied address header. Behind the Next.js proxy, limits can group callers under the proxy address: configure and review trusted ingress topology before scaling public traffic. Do not expose or trust arbitrary forwarded-IP headers.

Audit events record workspace and membership changes in the mutation transaction. Identity events record session creation and revocation. Request URL logging is disabled to avoid recording OAuth codes. Identity diagnostics contain severity and a stable event name, without raw provider payloads. Keep database and audit access restricted, and establish retention and monitoring at deployment time.

Changing `AUTH_SECRET` can invalidate sessions and make encrypted provider tokens unreadable. Back up the key securely and follow the library's key-rotation guidance before rotation. Failures in the database fail closed. The API must be restarted after schema changes. No real GitHub credentials were available during local verification, so live consent and production HTTPS cookies need deployment verification.

## Verification

`pnpm test:integration` runs workspace, queue and identity tests against disposable PostgreSQL and Redis. The identity test creates its own test-only email-enabled Better Auth instance to exercise real sessions without contacting GitHub. It covers unauthenticated rejection, mutation CSRF, cross-tenant denial, recipient-only and single-use invitation acceptance, role changes, persisted selection, leaving, logout revocation, expiry, invalid OAuth state and auth throttling. `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check` and the production build remain required.

The anonymous sign-in and API-unavailable states were inspected in the browser. Full signed-in browser interaction, live GitHub consent, a production HTTPS deployment and repository-resource isolation are not covered by that inspection. See the official [Fastify integration](https://better-auth.com/docs/integrations/fastify) and [database migration guidance](https://better-auth.com/docs/concepts/database) for the library boundaries.
