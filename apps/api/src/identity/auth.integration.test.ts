import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID, createHmac } from "node:crypto";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { getMigrations } from "better-auth/db/migration";
import { createAuth } from "./auth.js";
import { registerIdentity } from "./routes.js";
import { registerRepositories } from "../repositories/routes.js";
import type { GitHubGateway } from "@codaryn/github";
import { buildApp } from "../app.js";

const origin = "http://localhost:3000";
test(
  "sessions protect tenant lifecycle, CSRF, invitations and revocation",
  { timeout: 60000 },
  async () => {
    if (!process.env.DATABASE_URL) {
      try {
        process.loadEnvFile();
      } catch {}
      try {
        process.loadEnvFile(new URL("../../../../.env", import.meta.url));
      } catch {}
    }
    assert.ok(process.env.DATABASE_URL);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const production = createAuth(pool, {
      baseURL: origin,
      origin,
      secret: randomUUID() + randomUUID(),
      githubClientId: "integration-test",
      githubClientSecret: "integration-test",
    });
    const auth = betterAuth({
      ...production.options,
      emailAndPassword: { enabled: true },
    });
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
    const app = buildApp();
    registerIdentity(app, auth, pool, origin, origin);
    const gateway: GitHubGateway = {
      verifyInstallation: async () => {},
      repositories: async () => [],
      branches: async () => [],
      commits: async () => [],
      resolve: async () => "a".repeat(40),
      archive: async () => Buffer.alloc(0),
    };
    registerRepositories(app, auth, pool, origin, {
      github: gateway,
      slug: "test-app",
      webhookSecret: "test-webhook-secret",
    });
    const delivery = randomUUID();

    const users: string[] = [];
    const organizations: string[] = [];
    async function account() {
      const response = await auth.handler(
        new Request(`${origin}/api/auth/sign-up/email`, {
          method: "POST",
          headers: { origin, "content-type": "application/json" },
          body: JSON.stringify({
            name: "Test",
            email: `${randomUUID()}@example.com`,
            password: randomUUID() + "Aa1!",
          }),
        }),
      );
      assert.equal(response.status, 200, await response.clone().text());
      const data = await response.json();
      users.push(data.user.id);
      const cookie = response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      assert.match(response.headers.get("set-cookie") ?? "", /httponly/i);
      return { id: data.user.id as string, cookie };
    }
    try {
      const payload =
        '{ "installation": {"id": 999999999}, "action": "deleted" }';
      const signature = `sha256=${createHmac("sha256", "test-webhook-secret").update(payload).digest("hex")}`;
      const hook = () =>
        app.inject({
          method: "POST",
          url: "/api/v1/github/webhook",
          headers: {
            "content-type": "application/json",
            "x-hub-signature-256": signature,
            "x-github-event": "installation",
            "x-github-delivery": delivery,
          },
          payload,
        });
      assert.equal((await hook()).statusCode, 200);
      assert.equal((await hook()).json().duplicate, true);
      assert.equal(
        (
          await app.inject({
            method: "GET",
            url: "/api/v1/github/configuration",
          })
        ).statusCode,
        401,
      );
      const owner = await account();
      const guest = await account();
      async function api(
        path: string,
        cookie: string,
        body?: Record<string, unknown>,
        csrf = true,
      ) {
        return app.inject({
          method: body ? "POST" : "GET",
          url: `/api/v1/workspace/${path}`,
          headers: {
            cookie,
            ...(csrf ? { origin, "x-codaryn-request": "workspace" } : {}),
          },
          ...(body ? { payload: body } : {}),
        });
      }
      assert.equal((await api("list", "")).statusCode, 401);
      assert.equal(
        (await api("create", owner.cookie, { name: "Denied" }, false))
          .statusCode,
        403,
      );
      const created = await api("create", owner.cookie, { name: "Private" });
      assert.equal(created.statusCode, 200);
      const id = created.json().id;
      organizations.push(id);
      assert.equal(
        (await api(`details?id=${id}`, guest.cookie)).statusCode,
        404,
      );
      const invitation = await api("invite", owner.cookie, {
        id,
        recipientId: guest.id,
        role: "member",
      });
      assert.equal(invitation.statusCode, 200);
      assert.equal(
        (await api("accept", owner.cookie, { id: invitation.json().id }))
          .statusCode,
        404,
      );
      assert.equal(
        (await api("accept", guest.cookie, { id: invitation.json().id }))
          .statusCode,
        200,
      );
      assert.equal(
        (await api("accept", guest.cookie, { id: invitation.json().id }))
          .statusCode,
        404,
      );
      assert.equal(
        (await api("rename", guest.cookie, { id, name: "Forbidden" }))
          .statusCode,
        404,
      );
      assert.equal(
        (
          await api("member", owner.cookie, {
            id,
            userId: guest.id,
            role: "admin",
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (await api("rename", guest.cookie, { id, name: "Updated" })).statusCode,
        200,
      );
      assert.equal((await api("switch", guest.cookie, { id })).statusCode, 200);
      assert.equal((await api("list", guest.cookie)).json().active, id);
      assert.equal(
        (
          await api("member", guest.cookie, {
            id,
            userId: guest.id,
            role: null,
          })
        ).statusCode,
        200,
      );
      assert.equal(
        (await api(`details?id=${id}`, guest.cookie)).statusCode,
        404,
      );
      const logout = await auth.handler(
        new Request(`${origin}/api/auth/sign-out`, {
          method: "POST",
          headers: {
            origin,
            cookie: owner.cookie,
            "content-type": "application/json",
          },
          body: "{}",
        }),
      );
      assert.equal(logout.status, 200);
      assert.equal((await api("list", owner.cookie)).statusCode, 401);
      await pool.query(
        `UPDATE "session" SET "expiresAt"=now()-interval '1 hour' WHERE "userId"=$1`,
        [guest.id],
      );
      assert.equal((await api("list", guest.cookie)).statusCode, 401);
      const callback = await auth.handler(
        new Request(
          `${origin}/api/auth/callback/github?code=invalid&state=invalid`,
        ),
      );
      assert.notEqual(callback.status, 200);
      let throttled = false;
      for (let attempt = 0; attempt < 35; attempt++) {
        const response = await auth.handler(
          new Request(`${origin}/api/auth/sign-in/social`, {
            method: "POST",
            headers: {
              origin,
              "content-type": "application/json",
              "x-codaryn-client-ip": "127.0.0.2",
            },
            body: JSON.stringify({ provider: "unsupported" }),
          }),
        );
        if (response.status === 429) {
          throttled = true;
          break;
        }
      }
      assert.equal(throttled, true);
    } finally {
      await app.close();
      await pool.query(
        "DELETE FROM github_webhook_events WHERE delivery_id=$1",
        [delivery],
      );
      for (const id of organizations) {
        await pool.query("DELETE FROM audit_events WHERE organization_id=$1", [
          id,
        ]);
        await pool.query("DELETE FROM organizations WHERE id=$1", [id]);
      }
      for (const id of users) {
        await pool.query('DELETE FROM "user" WHERE id=$1', [id]);
        await pool.query("DELETE FROM identity_audit_events WHERE user_id=$1", [
          id,
        ]);
        await pool.query("DELETE FROM app_users WHERE id=$1", [id]);
      }
      await pool.end();
    }
  },
);
