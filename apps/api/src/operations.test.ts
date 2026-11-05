import { test } from "node:test";
import { strict as assert } from "node:assert";
import { Pool } from "pg";
import { buildApp } from "./app.js";
import { requestGroup } from "./operations/ingress.js";
test("database outage fails readiness and protected ingress closed while liveness survives", async () => {
  const pool = new Pool({
      connectionString: "postgres://codaryn:fixture@127.0.0.1:1/unavailable",
      connectionTimeoutMillis: 100,
    }),
    app = buildApp({ pool, secret: "fixture-secret-32-characters-or-more" });
  try {
    assert.equal((await app.inject({ url: "/api/v1/health" })).statusCode, 200);
    const readiness = await app.inject({ url: "/api/v1/ready" });
    assert.equal(readiness.statusCode, 503);
    assert.deepEqual(readiness.json(), { status: "unavailable" });
    const blocked = await app.inject({
      method: "POST",
      url: "/api/v1/analysis-configurations/validate",
      payload: {},
    });
    assert.equal(blocked.statusCode, 503);
    assert.ok(!blocked.body.includes("postgres"));
    assert.ok(!blocked.body.includes("127.0.0.1"));
    assert.equal(
      requestGroup("/api/v1/graph/snapshot?workspaceId=private"),
      "graph",
    );
    assert.equal(requestGroup("/private-path"), "other");
  } finally {
    await app.close();
    await pool.end();
  }
});
