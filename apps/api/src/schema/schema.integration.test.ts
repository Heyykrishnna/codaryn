import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { extractSchema } from "@codaryn/schema-engine";
import { buildApp } from "../app.js";
import { SchemaService } from "./service.js";
import { registerSchema } from "./routes.js";

test("Schema API isolates workspaces, validates requests and exports the same immutable snapshot", async () => {
  assert.ok(process.env.DATABASE_URL, "Use a disposable database");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const app = buildApp();
  const owner = randomUUID(),
    outsider = randomUUID(),
    workspace = randomUUID(),
    repo = randomUUID(),
    manifest = randomUUID(),
    job = randomUUID();
  const installation = Math.floor(Math.random() * 1000000000) + 1;
  const commit = "a".repeat(40);
  const origin = "http://localhost:3000";
  registerSchema(
    app,
    {
      api: {
        getSession: async ({ headers }) => {
          const id = headers.get("x-test-user");
          return id
            ? { user: { id }, session: { createdAt: new Date() } }
            : null;
        },
      },
    },
    new SchemaService(pool),
    origin,
  );
  const get = (
    action: string,
    input: Record<string, string> = {},
    actor: string = owner,
  ) =>
    app.inject({
      method: "GET",
      url: `/api/v1/schema/${action}?${new URLSearchParams({ workspaceId: workspace, ...input })}`,
      headers: actor ? { "x-test-user": actor } : {},
    });
  try {
    await pool.query("INSERT INTO app_users(id) VALUES ($1),($2)", [
      owner,
      outsider,
    ]);
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES ($1,'Schema API')",
      [workspace],
    );
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner')",
      [workspace, owner],
    );
    await pool.query(
      "INSERT INTO github_installations(id,organization_id) VALUES ($1,$2)",
      [installation, workspace],
    );
    await pool.query(
      "INSERT INTO connected_repositories(id,installation_id,github_id,full_name,private,default_branch) VALUES ($1,$2,1,'owner/repo',true,'main')",
      [repo, installation],
    );
    await pool.query(
      "INSERT INTO analysis_manifests(id,organization_id,repository_id,actor_id,manifest,hash) VALUES ($1,$2,$3,$4,$5,$6)",
      [manifest, workspace, repo, owner, { commitSha: commit }, "b".repeat(64)],
    );
    await pool.query(
      "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha) VALUES ($1,$2,$3,$4,$5,'main',$6)",
      [job, workspace, repo, manifest, owner, commit],
    );
    assert.equal((await get("snapshots", {}, "")).statusCode, 401);
    assert.equal((await get("snapshots", {}, outsider)).statusCode, 404);
    const request = () =>
      app.inject({
        method: "POST",
        url: "/api/v1/schema/request",
        headers: {
          "x-test-user": owner,
          origin,
          "x-codaryn-request": "workspace",
        },
        payload: { workspaceId: workspace, jobId: job, inferRelations: false },
      });
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/schema/request",
          headers: { "x-test-user": owner },
          payload: { workspaceId: workspace, jobId: job },
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (await get("tables", { snapshotId: "invalid" })).statusCode,
      400,
    );
    assert.equal((await get("snapshots", { page: "0" })).statusCode, 400);
    const queued = await request();
    assert.equal(queued.statusCode, 202);
    const id: string = queued.json().id;
    assert.equal((await get("tables", { snapshotId: id })).statusCode, 409);
    const result = extractSchema({
      "schema.sql":
        "CREATE TABLE users(id integer PRIMARY KEY, email text UNIQUE);",
    });
    await pool.query(
      "UPDATE analysis_schema_snapshots SET status='completed',snapshot=$2,hash=$3,table_count=1 WHERE id=$1",
      [id, result.snapshot, result.hash],
    );
    const listed = await get("tables", { snapshotId: id });
    assert.equal(listed.statusCode, 200);
    assert.equal(listed.json().items.length, 1);
    assert.equal(listed.headers["cache-control"], "no-store");
    assert.equal(
      (
        await get("table", {
          snapshotId: id,
          tableId: result.snapshot.tables[0].id,
        })
      ).json().table.name,
      "users",
    );
    assert.equal(
      (
        await get("column", {
          snapshotId: id,
          tableId: result.snapshot.tables[0].id,
          columnId: result.snapshot.tables[0].columns[0].id,
        })
      ).json().column.name,
      "id",
    );
    assert.equal(
      (await get("overview", { snapshotId: id }, outsider)).statusCode,
      404,
    );
    assert.equal(
      (await get("export", { snapshotId: id, format: "svg" }, outsider))
        .statusCode,
      404,
    );
    const svg = await get("export", { snapshotId: id, format: "svg" });
    assert.equal(svg.statusCode, 200);
    assert.ok(svg.body.includes(result.hash));
    assert.ok(
      String(svg.headers["content-security-policy"]).includes("sandbox"),
    );
    assert.ok(
      (
        await get("export", { snapshotId: id, format: "markdown" })
      ).body.includes(result.hash),
    );
    assert.equal(
      (await get("export", { snapshotId: id, format: "json" })).json().hash,
      result.hash,
    );
    assert.equal(
      (await get("compare", { snapshotId: id, otherId: id })).json().changes
        .length,
      0,
    );
    assert.equal(
      (await get("tables", { snapshotId: id, search: "absent" })).json().total,
      0,
    );
    await pool.query("UPDATE organizations SET deleted_at=now() WHERE id=$1", [
      workspace,
    ]);
    assert.equal((await get("overview", { snapshotId: id })).statusCode, 404);
  } finally {
    await app.close();
    await pool.query(
      "DELETE FROM analysis_schema_snapshots WHERE organization_id=$1",
      [workspace],
    );
    await pool.query("DELETE FROM analysis_jobs WHERE id=$1", [job]);
    await pool.query("DELETE FROM analysis_manifests WHERE id=$1", [manifest]);
    await pool.query("DELETE FROM connected_repositories WHERE id=$1", [repo]);
    await pool.query("DELETE FROM github_installations WHERE id=$1", [
      installation,
    ]);
    await pool.query("DELETE FROM audit_events WHERE organization_id=$1", [
      workspace,
    ]);
    await pool.query(
      "DELETE FROM organization_members WHERE organization_id=$1",
      [workspace],
    );
    await pool.query("DELETE FROM organizations WHERE id=$1", [workspace]);
    await pool.query("DELETE FROM app_users WHERE id=ANY($1::text[])", [
      [owner, outsider],
    ]);
    await pool.end();
  }
});
