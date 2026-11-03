import { authPersistenceOptions } from "./persistence.js";
import { randomUUID } from "node:crypto";
import { betterAuth } from "better-auth";
import type { Pool } from "pg";

export function createAuth(
  pool: Pool,
  config: {
    baseURL: string;
    origin: string;
    secret: string;
    githubClientId: string;
    githubClientSecret: string;
  },
) {
  const publicURL = new URL(config.baseURL);
  if (publicURL.origin !== new URL(config.origin).origin)
    throw new Error("Authentication and web origins must match");
  if (process.env.NODE_ENV === "production" && publicURL.protocol !== "https:")
    throw new Error("Production authentication requires HTTPS");
  const persistence = authPersistenceOptions(pool);
  return betterAuth({
    ...persistence,
    disabledPaths: ["/get-access-token", "/refresh-token"],
    logger: {
      log: (level) => {
        console.error(JSON.stringify({ event: "identity.diagnostic", level }));
      },
    },
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: [config.origin],
    socialProviders: {
      github: {
        scope: ["read:user", "user:email", "read:org"],
        clientId: config.githubClientId,
        clientSecret: config.githubClientSecret,
      },
    },
    account: { encryptOAuthTokens: true, accountLinking: { enabled: false } },
    session: {
      expiresIn: 28800,
      disableSessionRefresh: true,
      freshAge: 3600,
      cookieCache: { enabled: false },
    },
    advanced: {
      ...persistence.advanced,
      ipAddress: { ipAddressHeaders: ["x-codaryn-client-ip"] },
      useSecureCookies: config.baseURL.startsWith("https:"),
    },
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            await pool.query(
              "INSERT INTO identity_audit_events (id,user_id,action) VALUES ($1,$2,$3)",
              [randomUUID(), session.userId, "session.created"],
            );
          },
        },
        delete: {
          after: async (session) => {
            await pool.query(
              "INSERT INTO identity_audit_events (id,user_id,action) VALUES ($1,$2,$3)",
              [randomUUID(), session.userId, "session.revoked"],
            );
          },
        },
      },
      user: {
        create: {
          after: async (user) => {
            await pool.query(
              "INSERT INTO app_users (id) VALUES ($1) ON CONFLICT DO NOTHING",
              [user.id],
            );
          },
        },
      },
    },
  });
}
export type IdentityAuth = ReturnType<typeof createAuth>;
