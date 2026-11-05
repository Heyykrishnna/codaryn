import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { extractExecution } from "@codaryn/execution-analyzer";
import { buildApp } from "../app.js";
import { ExecutionService } from "./service.js";
import { registerExecution } from "./routes.js";

test("Execution API isolates workspaces and bounds graph traversal and local flow retrieval", async () => {
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
  registerExecution(
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
    new ExecutionService(pool),
    origin,
  );
  const get = (
    action: string,
    input: Record<string, string> = {},
    actor: string = owner,
  ) =>
    app.inject({
      method: "GET",
      url: `/api/v1/execution/${action}?${new URLSearchParams({ workspaceId: workspace, ...input })}`,
      headers: actor ? { "x-test-user": actor } : {},
    });
  try {
    await pool.query("INSERT INTO app_users(id) VALUES ($1),($2)", [
      owner,
      outsider,
    ]);
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES ($1,'Execution API')",
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
        url: "/api/v1/execution/request",
        headers: {
          "x-test-user": owner,
          origin,
          "x-codaryn-request": "workspace",
        },
        payload: { workspaceId: workspace, jobId: job },
      });
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/execution/request",
          headers: { "x-test-user": owner },
          payload: { workspaceId: workspace, jobId: job },
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (await get("functions", { snapshotId: "invalid" })).statusCode,
      400,
    );
    assert.equal((await get("snapshots", { page: "0" })).statusCode, 400);
    const queued = await request();
    assert.equal(queued.statusCode, 202);
    const id: string = queued.json().id;
    assert.equal((await get("functions", { snapshotId: id })).statusCode, 409);
    const result = extractExecution({
      "source.ts":
        "export function end(value:number){return value;} export function start(){return end(2);}",
    });
    await pool.query(
      "UPDATE analysis_execution_snapshots SET status='completed',snapshot=$2,hash=$3,function_count=3 WHERE id=$1",
      [id, result.snapshot, result.hash],
    );

    const listed = await get("functions", { snapshotId: id });
    assert.equal(listed.statusCode, 200);
    assert.equal(listed.json().total, 3);
    assert.equal(listed.headers["cache-control"], "no-store");
    const start = result.snapshot.functions.find((fn) => fn.name === "start")!,
      end = result.snapshot.functions.find((fn) => fn.name === "end")!;
    for (const action of ["function", "control-flow", "data-flow"]) {
      const response = await get(action, {
        snapshotId: id,
        functionId: start.id,
      });
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().function.name, "start");
      assert.equal(
        (await get(action, { snapshotId: id, functionId: start.id }, outsider))
          .statusCode,
        404,
      );
    }
    assert.equal(
      (
        await get("data-flow", {
          snapshotId: id,
          functionId: start.id,
          scope: "interprocedural",
        })
      ).statusCode,
      400,
    );
    assert.equal((await get("jobs", {}, outsider)).statusCode, 404);
    assert.equal((await get("jobs")).json().jobs[0].id, job);
    const paths = await get("paths", {
      snapshotId: id,
      functionId: start.id,
      targetId: end.id,
    });
    assert.equal(paths.statusCode, 200);
    assert.equal(paths.json().paths.length, 1);
    assert.equal(paths.json().semantics, "potential-static");
    assert.equal(
      (
        await get("paths", {
          snapshotId: id,
          functionId: start.id,
          targetId: end.id,
          depth: "13",
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (await get("neighborhood", { snapshotId: id, functionId: start.id }))
        .statusCode,
      200,
    );
    assert.equal(
      (await get("function", { snapshotId: id, functionId: "absent" }))
        .statusCode,
      404,
    );
    assert.equal(
      (await get("functions", { snapshotId: id, search: "absent" })).json()
        .total,
      0,
    );
    assert.equal(
      (await get("overview", { snapshotId: id }, outsider)).statusCode,
      404,
    );
    const concurrent = await Promise.all(
      Array.from({ length: 6 }, () => request()),
    );
    assert.equal(
      concurrent.filter((response) => response.statusCode === 202).length,
      4,
    );
    assert.equal(
      concurrent.filter((response) => response.statusCode === 429).length,
      2,
    );
    await pool.query("UPDATE organizations SET deleted_at=now() WHERE id=$1", [
      workspace,
    ]);
    assert.equal((await get("overview", { snapshotId: id })).statusCode, 404);
  } finally {
    await app.close();
    await pool.query(
      "DELETE FROM analysis_execution_snapshots WHERE organization_id=$1",
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
