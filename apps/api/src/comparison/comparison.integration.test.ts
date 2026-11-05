import { registerWebhook } from "../repositories/routes.js";
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID, createHmac } from "node:crypto";
import { Pool } from "pg";
import { extractVersion } from "@codaryn/version-engine";
import { studioDefaults } from "@codaryn/contracts";
import { buildApp } from "../app.js";
import { createManifest } from "../studio/manifest.js";
import { receiveWebhook } from "../repositories/webhook.js";
import { registerComparison } from "./routes.js";
import { ComparisonService } from "./service.js";
test("version comparison APIs and signed push scheduling preserve workspace access immutable history and logical deduplication", async () => {
  assert.ok(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL }),
    app = buildApp(),
    owner = randomUUID(),
    outsider = randomUUID(),
    workspace = randomUUID(),
    repo = randomUUID(),
    otherRepo = randomUUID(),
    installation = Math.floor(Math.random() * 1e9) + 1,
    origin = "http://localhost:3000",
    jobs: string[] = [],
    manifests: string[] = [],
    deliveries: string[] = [];
  registerComparison(
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
    new ComparisonService(pool),
    origin,
  );
  registerWebhook(app, pool, {
    slug: "fixture",
    webhookSecret: "fixture-webhook-secret",
    github: {
      verifyInstallation: async () => {},
      repositories: async () => [],
      branches: async () => [],
      commits: async () => [],
      resolve: async (_id, _repo, ref) => ref,
      archive: async () => Buffer.alloc(0),
    },
  });
  const get = (
    action: string,
    input: Record<string, string> = {},
    actor: string = owner,
  ) =>
    app.inject({
      method: "GET",
      url: `/api/v1/comparison/${action}?${new URLSearchParams({ workspaceId: workspace, ...input })}`,
      headers: actor ? { "x-test-user": actor } : {},
    });
  const post = (
    action: string,
    input: Record<string, unknown>,
    actor: string = owner,
    csrf = true,
  ) =>
    app.inject({
      method: "POST",
      url: `/api/v1/comparison/${action}`,
      headers: {
        "x-test-user": actor,
        ...(csrf ? { origin, "x-codaryn-request": "workspace" } : {}),
      },
      payload: { workspaceId: workspace, ...input },
    });
  const job = async (commit: string, repository = repo) => {
    const manifestId = randomUUID(),
      id = randomUUID(),
      created = createManifest(repository, commit, studioDefaults);
    manifests.push(manifestId);
    jobs.push(id);
    await pool.query(
      "INSERT INTO analysis_manifests(id,organization_id,repository_id,actor_id,manifest,hash) VALUES($1,$2,$3,$4,$5,$6)",
      [
        manifestId,
        workspace,
        repository,
        owner,
        created.manifest,
        created.hash,
      ],
    );
    await pool.query(
      "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha) VALUES($1,$2,$3,$4,$5,'main',$6)",
      [id, workspace, repository, manifestId, owner, commit],
    );
    return id;
  };
  const webhook = async (
    commit: string,
    delivery = randomUUID(),
    signature = true,
    branch = "refs/heads/main",
  ) => {
    deliveries.push(delivery);
    const payload = Buffer.from(
        JSON.stringify({
          installation: { id: installation },
          repository: { id: 72 },
          ref: branch,
          after: commit,
          before: "a".repeat(40),
          deleted: false,
        }),
      ),
      secret = "fixture-webhook-secret",
      signed =
        "sha256=" + createHmac("sha256", secret).update(payload).digest("hex");
    return receiveWebhook(
      pool,
      secret,
      payload,
      signature ? signed : "sha256=" + "0".repeat(64),
      "push",
      delivery,
    );
  };
  try {
    await pool.query("INSERT INTO app_users(id) VALUES($1),($2)", [
      owner,
      outsider,
    ]);
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES($1,'Comparison tests')",
      [workspace],
    );
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
      [workspace, owner],
    );
    await pool.query(
      "INSERT INTO github_installations(id,organization_id) VALUES($1,$2)",
      [installation, workspace],
    );
    await pool.query(
      "INSERT INTO connected_repositories(id,installation_id,github_id,full_name,private,default_branch) VALUES($1,$3,72,'owner/repo',true,'main'),($2,$3,73,'owner/other',true,'main')",
      [repo, otherRepo, installation],
    );
    const first = await job("a".repeat(40)),
      second = await job("b".repeat(40)),
      third = await job("c".repeat(40), otherRepo);
    assert.equal((await get("versions", {}, "")).statusCode, 401);
    assert.equal((await get("versions", {}, outsider)).statusCode, 404);
    assert.equal(
      (await post("request", { jobId: first }, owner, false)).statusCode,
      403,
    );
    assert.equal(
      (await post("request", { jobId: first, extra: true })).statusCode,
      400,
    );
    assert.equal((await get("versions", { page: "-1" })).statusCode, 400);
    const request = await post("request", { jobId: first, verifyFull: true });
    assert.equal(request.statusCode, 202);
    const beforeId = request.json().id;
    assert.equal(
      (await post("compare", { fromId: beforeId, toId: beforeId })).statusCode,
      409,
    );
    const before = extractVersion({
        "a.ts": "export const value=1",
        "b.ts": "import './a';",
      }),
      after = extractVersion(
        { "a.ts": "export const changed=2", "b.ts": "import './a';" },
        before.snapshot,
        true,
      );
    await pool.query(
      "UPDATE analysis_version_snapshots SET status='completed',snapshot=$2,hash=$3,file_count=2 WHERE id=$1",
      [beforeId, before.snapshot, before.hash],
    );
    const next = await post("request", {
      jobId: second,
      baseId: beforeId,
      verifyFull: true,
    });
    assert.equal(next.statusCode, 202);
    const afterId = next.json().id;
    await pool.query(
      "UPDATE analysis_version_snapshots SET status='completed',snapshot=$2,hash=$3,file_count=2 WHERE id=$1",
      [afterId, after.snapshot, after.hash],
    );
    assert.equal(
      (await post("request", { jobId: third, baseId: beforeId })).statusCode,
      404,
    );
    const other = await post("request", { jobId: third });
    assert.equal(other.statusCode, 202);
    await pool.query(
      "UPDATE analysis_version_snapshots SET status='completed',snapshot=$2,hash=$3,file_count=2 WHERE id=$1",
      [other.json().id, before.snapshot, before.hash],
    );
    assert.equal(
      (await post("compare", { fromId: beforeId, toId: other.json().id }))
        .statusCode,
      400,
    );
    const compared = await post("compare", { fromId: beforeId, toId: afterId });
    assert.equal(compared.statusCode, 200);
    const id = compared.json().id;
    assert.equal(
      (await post("compare", { fromId: beforeId, toId: afterId })).json().id,
      id,
    );
    assert.equal(
      (await get("detail", { comparisonId: id }, outsider)).statusCode,
      404,
    );
    assert.equal(
      (await get("detail", { comparisonId: id, view: "impact" })).json().total,
      2,
    );
    assert.ok(
      (await get("detail", { comparisonId: id, kind: "removed" }))
        .json()
        .items.some((item: { object: string }) => item.object === "symbol"),
    );
    assert.equal((await get("history")).json().items.length, 1);
    assert.equal(
      (await get("overview", { snapshotId: afterId })).json().reuse
        .verification,
      "matched",
    );
    const stored = await pool.query<{ hash: string }>(
      "SELECT hash FROM analysis_version_snapshots WHERE id=$1",
      [beforeId],
    );
    assert.equal(stored.rows[0].hash, before.hash);
    assert.equal(
      (
        await post("policy", {
          jobId: first,
          ref: "refs/heads/main",
          enabled: true,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await post("policy", {
          jobId: first,
          ref: "refs/heads/../main",
          enabled: true,
        })
      ).statusCode,
      400,
    );
    await assert.rejects(
      () => webhook("d".repeat(40), randomUUID(), false),
      /INVALID_SIGNATURE/,
    );
    assert.equal(
      (await webhook("d".repeat(40), randomUUID(), true, "refs/heads/other"))
        .scheduled,
      false,
    );
    const delivery = randomUUID();
    assert.equal((await webhook("d".repeat(40), delivery)).scheduled, true);
    assert.equal((await webhook("d".repeat(40), delivery)).duplicate, true);
    assert.equal((await webhook("d".repeat(40))).scheduled, false);
    const scheduled = await pool.query<{
      commit_sha: string;
      base_snapshot_id: string;
    }>(
      "SELECT commit_sha,base_snapshot_id FROM analysis_version_snapshots WHERE trigger_key IS NOT NULL AND organization_id=$1",
      [workspace],
    );
    assert.equal(scheduled.rowCount, 1);
    assert.equal(scheduled.rows[0].commit_sha, "d".repeat(40));
    assert.equal(scheduled.rows[0].base_snapshot_id, beforeId);
    await pool.query(
      "INSERT INTO analysis_version_snapshots(id,job_id,organization_id,repository_id,actor_id,commit_sha,installation_generation,trigger_key) SELECT gen_random_uuid(),$1,$2,$3,$4,$5,1,'capacity:'||($2::uuid)::text||':'||g FROM generate_series(1,100) g",
      [first, workspace, repo, owner, "a".repeat(40)],
    );
    await assert.rejects(() => webhook("f".repeat(40)), /WEBHOOK_CAPACITY/);
    const capacityDelivery = randomUUID();
    deliveries.push(capacityDelivery);
    const capacityPayload = JSON.stringify({
      installation: { id: installation },
      repository: { id: 72 },
      ref: "refs/heads/main",
      after: "f".repeat(40),
      before: "a".repeat(40),
      deleted: false,
    });
    const limited = await app.inject({
      method: "POST",
      url: "/api/v1/github/webhook",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-github-delivery": capacityDelivery,
        "x-hub-signature-256":
          "sha256=" +
          createHmac("sha256", "fixture-webhook-secret")
            .update(capacityPayload)
            .digest("hex"),
      },
      payload: capacityPayload,
    });
    assert.equal(limited.statusCode, 503);
    assert.equal(
      (
        await pool.query(
          "SELECT delivery_id FROM github_webhook_events WHERE delivery_id=$1",
          [capacityDelivery],
        )
      ).rowCount,
      0,
    );

    await pool.query(
      "DELETE FROM analysis_version_snapshots WHERE organization_id=$1 AND trigger_key LIKE 'capacity:%'",
      [workspace],
    );
    await pool.query(
      "UPDATE organization_members SET role='member' WHERE organization_id=$1",
      [workspace],
    );
    assert.equal(
      (
        await post("policy", {
          jobId: first,
          ref: "refs/heads/main",
          enabled: false,
        })
      ).statusCode,
      403,
    );
    assert.equal((await webhook("e".repeat(40))).scheduled, false);
    assert.equal((await get("policies")).json().canManage, false);
    await pool.query("UPDATE organizations SET deleted_at=now() WHERE id=$1", [
      workspace,
    ]);
    assert.equal((await get("history")).statusCode, 404);
  } finally {
    await app.close();
    await pool.query(
      "DELETE FROM architecture_comparisons WHERE organization_id=$1",
      [workspace],
    );
    await pool.query(
      "DELETE FROM repository_analysis_policies WHERE organization_id=$1",
      [workspace],
    );
    await pool.query(
      "DELETE FROM analysis_version_snapshots WHERE organization_id=$1",
      [workspace],
    );
    await pool.query("DELETE FROM analysis_jobs WHERE organization_id=$1", [
      workspace,
    ]);
    await pool.query(
      "DELETE FROM analysis_manifests WHERE organization_id=$1",
      [workspace],
    );
    await pool.query(
      "DELETE FROM connected_repositories WHERE installation_id=$1",
      [installation],
    );
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
    await pool.query(
      "DELETE FROM github_webhook_events WHERE delivery_id=ANY($1::uuid[])",
      [deliveries],
    );
    await pool.end();
  }
});
