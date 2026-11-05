import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { extractQuality } from "@codaryn/engineering-analyzer";
import { buildApp } from "../app.js";
import { QualityService } from "./service.js";
import { registerQuality } from "./routes.js";

test("Quality API isolates tenants and audits administrator triage with conflict protection", async () => {
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
  registerQuality(
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
    new QualityService(pool, true),
    origin,
  );
  const get = (
    action: string,
    input: Record<string, string> = {},
    actor: string = owner,
  ) =>
    app.inject({
      method: "GET",
      url: `/api/v1/quality/${action}?${new URLSearchParams({ workspaceId: workspace, ...input })}`,
      headers: actor ? { "x-test-user": actor } : {},
    });
  try {
    await pool.query("INSERT INTO app_users(id) VALUES ($1),($2)", [
      owner,
      outsider,
    ]);
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES ($1,'Quality API')",
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
        url: "/api/v1/quality/request",
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
          url: "/api/v1/quality/request",
          headers: { "x-test-user": owner },
          payload: { workspaceId: workspace, jobId: job },
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (await get("findings", { snapshotId: "invalid" })).statusCode,
      400,
    );
    assert.equal((await get("snapshots", { page: "0" })).statusCode, 400);
    const queued = await request();
    assert.equal(queued.statusCode, 202);
    const id: string = queued.json().id;
    assert.equal((await get("findings", { snapshotId: id })).statusCode, 409);

    const result = extractQuality({
      Dockerfile: "FROM node:22",
      "a.ts": "eval(input);",
    });
    await pool.query(
      "UPDATE analysis_quality_snapshots SET status='completed',snapshot=$2,hash=$3,finding_count=$4 WHERE id=$1",
      [id, result.snapshot, result.hash, result.snapshot.findings.length],
    );
    const findings = await get("findings", { snapshotId: id });
    assert.equal(findings.statusCode, 200);
    assert.equal(findings.json().total, 2);
    assert.equal(findings.headers["cache-control"], "no-store");
    const finding = result.snapshot.findings[0];
    assert.equal(
      (await get("finding", { snapshotId: id, objectId: finding.id }, outsider))
        .statusCode,
      404,
    );
    assert.equal((await get("resources", { snapshotId: id })).json().total, 1);
    assert.equal((await get("jobs")).json().jobs[0].id, job);
    const mutate = (input: Record<string, unknown>, actor = owner) =>
      app.inject({
        method: "POST",
        url: "/api/v1/quality/review",
        headers: {
          "x-test-user": actor,
          origin,
          "x-codaryn-request": "workspace",
        },
        payload: {
          workspaceId: workspace,
          snapshotId: id,
          findingId: finding.id,
          state: "confirmed",
          severity: "high",
          reason: "verified",
          revision: 0,
          ...input,
        },
      });
    assert.equal((await mutate({}, outsider)).statusCode, 404);
    assert.equal(
      (await mutate({ note: "unbounded notes are not accepted" })).statusCode,
      400,
    );
    assert.equal((await mutate({ findingId: "missing" })).statusCode, 404);
    const saved = await mutate({});
    assert.equal(saved.statusCode, 200);
    assert.equal(saved.json().revision, 1);
    assert.equal((await mutate({})).statusCode, 409);
    const filtered = await get("findings", {
      snapshotId: id,
      severity: "high",
      state: "confirmed",
    });
    assert.equal(filtered.json().total, 1);
    const audit = await get("audit", { snapshotId: id });
    assert.equal(audit.statusCode, 200);
    assert.equal(audit.json().items.length, 1);
    assert.equal(audit.json().items[0].after.state, "confirmed");
    await pool.query(
      "INSERT INTO quality_finding_events(id,snapshot_id,finding_id,actor_id,after_value) SELECT gen_random_uuid(),$1,'rate-test',$2,$3 FROM generate_series(1,59)",
      [id, owner, saved.json()],
    );
    assert.equal((await mutate({ revision: 1 })).statusCode, 429);
    await pool.query(
      "DELETE FROM quality_finding_events WHERE snapshot_id=$1 AND finding_id='rate-test'",
      [id],
    );
    assert.equal(
      (await get("findings", { snapshotId: id, severity: "invalid" }))
        .statusCode,
      400,
    );
    const stored = await pool.query<{ hash: string }>(
      "SELECT hash FROM analysis_quality_snapshots WHERE id=$1",
      [id],
    );
    assert.equal(stored.rows[0].hash, result.hash);
    await pool.query(
      "UPDATE organization_members SET role='member' WHERE organization_id=$1 AND user_id=$2",
      [workspace, owner],
    );
    assert.equal((await mutate({ revision: 1 })).statusCode, 403);
    assert.equal((await request()).statusCode, 202);
    const external = await app.inject({
      method: "POST",
      url: "/api/v1/quality/request",
      headers: {
        "x-test-user": owner,
        origin,
        "x-codaryn-request": "workspace",
      },
      payload: { workspaceId: workspace, jobId: job, externalScans: true },
    });
    assert.equal(external.statusCode, 403);
    assert.equal(
      (await get("overview", { snapshotId: id })).json().canReview,
      false,
    );
    await pool.query("UPDATE organizations SET deleted_at=now() WHERE id=$1", [
      workspace,
    ]);
    assert.equal((await get("overview", { snapshotId: id })).statusCode, 404);
  } finally {
    await app.close();
    await pool.query(
      "DELETE FROM analysis_quality_snapshots WHERE organization_id=$1",
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
