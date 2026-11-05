import { captureExport } from "../exports/capture.js";
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import {
  frozenExportSchema,
  defaultWorkspaceControls,
} from "@codaryn/contracts";
import { extractVersion } from "@codaryn/version-engine";
import { extractSchema } from "@codaryn/schema-engine";
import { buildApp } from "../app.js";
import { DiagramService } from "../diagrams/service.js";
import { ExportService } from "../exports/service.js";
import { registerExports } from "../exports/routes.js";
import { TeamStore } from "./store.js";
import { AdministrationService } from "./administration.js";
import { SharingService } from "./sharing.js";
import { DownloadService } from "./downloads.js";
import { RetentionService } from "./retention.js";
import { registerTeam } from "./routes.js";
test("team sharing signed exports and retention enforce current access immutable bindings audit and protected data", async () => {
  assert.ok(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL }),
    app = buildApp(),
    owner = randomUUID(),
    member = randomUUID(),
    outsider = randomUUID(),
    workspace = randomUUID(),
    other = randomUUID(),
    repo = randomUUID(),
    manifest = randomUUID(),
    job = randomUUID(),
    version = randomUUID(),
    installation = Math.floor(Math.random() * 1e9) + 1,
    commit = "a".repeat(40),
    secret = "privateLiteralFixture999",
    source = {
      "schema.sql": `CREATE TABLE users(id text DEFAULT '${secret}');`,
    },
    snapshot = extractVersion(source),
    schema = extractSchema(source),
    store = new TeamStore(pool),
    exports = new ExportService(pool),
    origin = "http://localhost:3000";
  const auth = {
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const id = headers.get("x-test-user");
        return id
          ? {
              user: { id },
              session: {
                createdAt: new Date(
                  Date.now() - Number(headers.get("x-test-age") ?? 0),
                ),
              },
            }
          : null;
      },
    },
  };
  registerTeam(
    app,
    auth,
    {
      administration: new AdministrationService(store),
      sharing: new SharingService(store, new DiagramService(pool)),
      downloads: new DownloadService(
        store,
        "fixture-signing-key-with-at-least-32-characters",
      ),
      retention: new RetentionService(store),
    },
    origin,
  );
  registerExports(app, auth, exports, origin);
  const get = (action: string, actor: string = owner, wsp = workspace) =>
    app.inject({
      method: "GET",
      url: `/api/v1/team/${action}?workspaceId=${wsp}`,
      headers: actor ? { "x-test-user": actor } : {},
    });
  const post = (
    action: string,
    body: Record<string, unknown>,
    actor: string = owner,
    options: { csrf?: boolean; age?: number } = {},
  ) =>
    app.inject({
      method: "POST",
      url: `/api/v1/team/${action}`,
      headers: {
        "x-test-user": actor,
        "x-test-age": String(options.age ?? 0),
        ...(options.csrf === false
          ? {}
          : { origin, "x-codaryn-request": "workspace" }),
      },
      payload: body,
    });
  const settings = (revision: number, extra: Record<string, unknown> = {}) =>
    post("settings", {
      workspaceId: workspace,
      ...defaultWorkspaceControls,
      revision,
      ...extra,
    });
  const createShare = (actor: string = owner, recipient: string = member) =>
    post(
      "share",
      {
        workspaceId: workspace,
        kind: "version",
        resourceId: version,
        recipientId: recipient,
        hours: 24,
      },
      actor,
    );
  const grant = async (actor: string = owner) => {
    const result = await post(
      "grant",
      { workspaceId: workspace, exportId },
      actor,
    );
    assert.equal(result.statusCode, 200, result.body);
    const [id, signature] = result.json().url.split("#")[1].split(".");
    return { id, signature };
  };
  const old = async (id: string, base: string | null = null) =>
    pool.query(
      "INSERT INTO analysis_version_snapshots(id,job_id,organization_id,repository_id,actor_id,commit_sha,installation_generation,status,snapshot,hash,file_count,created_at,base_snapshot_id) VALUES($1,$2,$3,$4,$5,$6,1,'completed',$7,$8,1,now()-interval '100 days',$9)",
      [
        id,
        job,
        workspace,
        repo,
        owner,
        commit,
        snapshot.snapshot,
        snapshot.hash,
        base,
      ],
    );
  let exportId = "";
  try {
    await pool.query("INSERT INTO app_users(id) VALUES($1),($2),($3)", [
      owner,
      member,
      outsider,
    ]);
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES($1,'Team fixture'),($2,'Other fixture')",
      [workspace, other],
    );
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner'),($1,$3,'member'),($4,$2,'owner')",
      [workspace, owner, member, other],
    );
    await pool.query(
      "INSERT INTO github_installations(id,organization_id) VALUES($1,$2)",
      [installation, workspace],
    );
    await pool.query(
      "INSERT INTO connected_repositories(id,installation_id,github_id,full_name,private,default_branch) VALUES($1,$2,1,'owner/private-repo',true,'main')",
      [repo, installation],
    );
    await pool.query(
      "INSERT INTO analysis_manifests(id,organization_id,repository_id,actor_id,manifest,hash) VALUES($1,$2,$3,$4,$5,$6)",
      [manifest, workspace, repo, owner, { commitSha: commit }, "b".repeat(64)],
    );
    await pool.query(
      "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha,status,current_stage) VALUES($1,$2,$3,$4,$5,'main',$6,'completed','completed')",
      [job, workspace, repo, manifest, owner, commit],
    );
    await old(version);
    await pool.query(
      "INSERT INTO analysis_schema_snapshots(id,job_id,organization_id,repository_id,actor_id,commit_sha,installation_generation,status,snapshot,hash,table_count) VALUES($1,$2,$3,$4,$5,$6,1,'completed',$7,$8,1)",
      [
        randomUUID(),
        job,
        workspace,
        repo,
        owner,
        commit,
        schema.snapshot,
        schema.hash,
      ],
    );
    assert.equal((await get("overview", "")).statusCode, 401);
    assert.equal((await get("overview", outsider)).statusCode, 404);
    assert.equal(
      (await post("share", {}, owner, { csrf: false })).statusCode,
      403,
    );
    assert.equal((await get("overview")).json().counts.members, 2);
    assert.equal((await createShare(member)).statusCode, 403);
    assert.equal(
      (
        await post(
          "settings",
          { workspaceId: workspace, ...defaultWorkspaceControls },
          member,
        )
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await post(
          "settings",
          { workspaceId: workspace, ...defaultWorkspaceControls },
          owner,
          { age: 7200000 },
        )
      ).statusCode,
      403,
    );
    assert.equal((await settings(0)).statusCode, 200);
    assert.equal((await settings(0)).statusCode, 409);
    const shared = await createShare();
    assert.equal(shared.statusCode, 200, shared.body);
    const token = shared.json().url.split("#")[1];
    assert.equal((await post("shared", { token }, outsider)).statusCode, 404);
    const opened = await post("shared", { token }, member);
    assert.equal(opened.statusCode, 200, opened.body);
    assert.ok(!opened.body.includes(secret));
    assert.ok(!("source" in opened.json()));
    assert.equal(
      (
        await post("share", {
          workspaceId: other,
          kind: "version",
          resourceId: version,
          recipientId: owner,
          hours: 1,
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (
        await post(
          "share-revoke",
          { workspaceId: workspace, id: shared.json().id },
          member,
        )
      ).statusCode,
      404,
    );
    await pool.query(
      "DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2",
      [workspace, member],
    );
    assert.equal((await post("shared", { token }, owner)).statusCode, 404);
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'member')",
      [workspace, member],
    );
    assert.equal(
      (
        await post("share-revoke", {
          workspaceId: workspace,
          id: shared.json().id,
        })
      ).statusCode,
      200,
    );
    assert.equal((await post("shared", { token }, member)).statusCode, 404);
    const layout = await new DiagramService(pool).saveLayout(
      owner,
      workspace,
      job,
      "erd",
      "Saved ERD",
      {},
    );
    const diagramShare = await post("share", {
      workspaceId: workspace,
      kind: "diagram",
      resourceId: layout.id,
      recipientId: member,
      hours: 1,
    });
    assert.equal(diagramShare.statusCode, 200, diagramShare.body);
    const diagram = await post(
      "shared",
      { token: diagramShare.json().url.split("#")[1] },
      member,
    );
    assert.equal(diagram.statusCode, 200, diagram.body);
    assert.ok(diagram.body.includes("users"));
    assert.ok(!diagram.body.includes(secret));
    await pool.query(
      "UPDATE resource_shares SET expires_at=now()-interval '1 second' WHERE id=$1",
      [diagramShare.json().id],
    );
    assert.equal(
      (
        await post(
          "shared",
          { token: diagramShare.json().url.split("#")[1] },
          member,
        )
      ).statusCode,
      404,
    );
    const activeShare = await createShare();
    assert.equal(activeShare.statusCode, 200);
    const captureClient = await pool.connect();
    try {
      const rendered = await captureExport(
        captureClient,
        new DiagramService(pool),
        workspace,
        job,
        { jobId: job, exportType: "diagram", format: "svg", targetId: "erd" },
      );
      assert.ok(!JSON.stringify(rendered).includes(secret));
    } finally {
      captureClient.release();
    }
    const scheduled = await app.inject({
      method: "POST",
      url: `/api/v1/workspaces/${workspace}/analysis/${job}/exports`,
      headers: {
        "x-test-user": owner,
        origin,
        "x-codaryn-request": "workspace",
      },
      payload: {
        jobId: job,
        exportType: "diagram",
        format: "svg",
        targetId: "erd",
      },
    });
    assert.equal(scheduled.statusCode, 202, scheduled.body);
    exportId = scheduled.json().id;
    const bound = (
        await pool.query<{ artifact_binding: unknown }>(
          "SELECT artifact_binding FROM export_jobs WHERE id=$1",
          [exportId],
        )
      ).rows[0],
      frozen = frozenExportSchema.parse(bound.artifact_binding);
    assert.ok(frozen.artifact.content.includes("users"));
    assert.ok(!JSON.stringify(frozen).includes(secret));
    assert.equal(frozen.commitSha, commit);
    await pool.query(
      "UPDATE export_jobs SET status='completed',artifact_size=$2,artifact_hash=$3,created_at=now()-interval '100 days' WHERE id=$1",
      [exportId, frozen.artifact.size, frozen.artifact.hash],
    );
    await pool.query(
      "INSERT INTO export_artifacts(id,export_job_id,organization_id,content_type,filename,payload,size,hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        randomUUID(),
        exportId,
        workspace,
        frozen.artifact.contentType,
        frozen.artifact.filename,
        frozen.artifact.content,
        frozen.artifact.size,
        frozen.artifact.hash,
      ],
    );
    const first = await grant();
    assert.equal((await post("redeem", first, member)).statusCode, 404);
    assert.equal(
      (await post("redeem", { ...first, signature: "0".repeat(64) }))
        .statusCode,
      404,
    );
    const downloaded = await post("redeem", first);
    assert.equal(downloaded.statusCode, 200, downloaded.body);
    assert.equal(
      createHash("sha256").update(downloaded.body).digest("hex"),
      frozen.artifact.hash,
    );
    assert.equal((await post("redeem", first)).statusCode, 404);
    const concurrent = await grant();
    const redemptions = await Promise.all([
      post("redeem", concurrent),
      post("redeem", concurrent),
    ]);
    assert.deepEqual(
      redemptions.map((response) => response.statusCode).sort(),
      [200, 404],
    );
    const revoked = await grant();
    await post("grant-revoke", { workspaceId: workspace, id: revoked.id });
    assert.equal((await post("redeem", revoked)).statusCode, 404);
    const expired = await grant();
    await pool.query(
      "UPDATE export_download_grants SET expires_at=now()-interval '1 second' WHERE id=$1",
      [expired.id],
    );
    assert.equal((await post("redeem", expired)).statusCode, 404);
    const memberGrant = await grant(member);
    assert.equal(
      (
        await settings(1, {
          allowMemberExports: false,
          allowMemberSharing: true,
          retentionEnabled: true,
          retentionDays: 7,
        })
      ).statusCode,
      200,
    );
    assert.equal((await post("redeem", memberGrant, member)).statusCode, 403);
    const memberShare = await createShare(member, owner);
    assert.equal(memberShare.statusCode, 200, memberShare.body);
    assert.equal(
      (
        await settings(2, {
          allowMemberExports: true,
          allowMemberSharing: false,
          retentionEnabled: true,
          retentionDays: 7,
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (await post("shared", { token: memberShare.json().url.split("#")[1] }))
        .statusCode,
      404,
    );
    await pool.query(
      "UPDATE export_download_grants SET revoked_at=now() WHERE id=$1",
      [memberGrant.id],
    );
    const pinnedGrant = await grant(),
      eligible = randomUUID(),
      baseline = randomUUID(),
      referenced = randomUUID();
    await old(eligible);
    await old(baseline);
    await old(referenced, baseline);
    await pool.query(
      "INSERT INTO architecture_comparisons(id,organization_id,repository_id,actor_id,from_id,to_id,result,hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        randomUUID(),
        workspace,
        repo,
        owner,
        referenced,
        version,
        {
          version: 1,
          changes: [],
          impact: [],
          drift: [],
          truncated: false,
          semantics: "potential-static",
        },
        "c".repeat(64),
      ],
    );
    const current = randomUUID();
    await old(current);
    await pool.query(
      "UPDATE analysis_version_snapshots SET created_at=now() WHERE id=$1",
      [current],
    );
    const preview = await get("retention-preview");
    assert.equal(preview.statusCode, 200, preview.body);
    assert.ok(
      preview
        .json()
        .candidates.some((item: { id: string }) => item.id === eligible),
    );
    for (const id of [version, baseline, referenced, current, exportId])
      assert.ok(
        !preview
          .json()
          .candidates.some((item: { id: string }) => item.id === id),
      );
    assert.equal(
      (
        await post("retention-apply", {
          workspaceId: workspace,
          revision: 2,
          hash: preview.json().hash,
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (
        await post(
          "retention-apply",
          { workspaceId: workspace, revision: 3, hash: preview.json().hash },
          owner,
          { age: 7200000 },
        )
      ).statusCode,
      403,
    );
    const applied = await post("retention-apply", {
      workspaceId: workspace,
      revision: 3,
      hash: preview.json().hash,
    });
    assert.equal(applied.statusCode, 200, applied.body);
    assert.ok(applied.json().deleted >= 1);
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM analysis_version_snapshots WHERE id=$1",
          [eligible],
        )
      ).rowCount,
      0,
    );
    assert.equal((await post("redeem", pinnedGrant)).statusCode, 200);
    assert.equal(
      (
        await post(
          "shared",
          { token: activeShare.json().url.split("#")[1] },
          member,
        )
      ).statusCode,
      200,
    );
    const events = await get("activity");
    assert.equal(events.statusCode, 200);
    assert.ok(events.body.includes("team.retention.applied"));
    assert.ok(!events.body.includes(token));
    assert.ok((await get("usage")).json().items.length > 0);
    assert.equal(
      (
        await pool.query<{ hash: string }>(
          "SELECT hash FROM analysis_version_snapshots WHERE id=$1",
          [version],
        )
      ).rows[0].hash,
      snapshot.hash,
    );
  } finally {
    await app.close();
    for (const table of [
      "export_download_grants",
      "resource_shares",
      "workspace_usage_daily",
      "workspace_controls",
      "architecture_comparisons",
      "repository_analysis_policies",
      "export_jobs",
      "analysis_schema_snapshots",
      "analysis_version_snapshots",
      "saved_diagram_layouts",
      "analysis_jobs",
      "analysis_manifests",
    ]) {
      await pool.query(`DELETE FROM ${table} WHERE organization_id=$1`, [
        workspace,
      ]);
    }
    await pool.query("DELETE FROM connected_repositories WHERE id=$1", [repo]);
    await pool.query("DELETE FROM github_installations WHERE id=$1", [
      installation,
    ]);
    await pool.query(
      "DELETE FROM audit_events WHERE organization_id=ANY($1::uuid[])",
      [[workspace, other]],
    );
    await pool.query(
      "DELETE FROM organization_members WHERE organization_id=ANY($1::uuid[])",
      [[workspace, other]],
    );
    await pool.query("DELETE FROM organizations WHERE id=ANY($1::uuid[])", [
      [workspace, other],
    ]);
    await pool.query("DELETE FROM app_users WHERE id=ANY($1::text[])", [
      [owner, member, outsider],
    ]);
    await pool.end();
  }
});
