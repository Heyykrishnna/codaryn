import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID, createHash } from "node:crypto";
import { Pool } from "pg";
import { exportArtifact } from "@codaryn/export-engine";
import { runOneExportJob } from "./process.js";
test("export worker publishes frozen artifacts once and rejects revoked or corrupted bindings", async () => {
  assert.ok(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL }),
    actor = randomUUID(),
    workspace = randomUUID(),
    repo = randomUUID(),
    manifest = randomUUID(),
    job = randomUUID(),
    installation = Math.floor(Math.random() * 1e9) + 1,
    commit = "a".repeat(40),
    artifact = exportArtifact(
      { jobId: job, exportType: "diagram", format: "svg", targetId: "system" },
      { jobId: job, commitSha: commit, repositoryName: "fixture/repo" },
    ),
    binding = { version: 1, jobId: job, commitSha: commit, artifact };
  const enqueue = async (id: string, value: unknown = binding) =>
    pool.query(
      "INSERT INTO export_jobs(id,organization_id,repository_id,job_id,actor_id,export_type,format,target_id,artifact_binding) VALUES($1,$2,$3,$4,$5,'diagram','svg','system',$6)",
      [id, workspace, repo, job, actor, value],
    );
  try {
    await pool.query("INSERT INTO app_users(id) VALUES($1)", [actor]);
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES($1,'Export worker fixture')",
      [workspace],
    );
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
      [workspace, actor],
    );
    await pool.query(
      "INSERT INTO github_installations(id,organization_id) VALUES($1,$2)",
      [installation, workspace],
    );
    await pool.query(
      "INSERT INTO connected_repositories(id,installation_id,github_id,full_name,private,default_branch) VALUES($1,$2,1,'fixture/repo',true,'main')",
      [repo, installation],
    );
    await pool.query(
      "INSERT INTO analysis_manifests(id,organization_id,repository_id,actor_id,manifest,hash) VALUES($1,$2,$3,$4,$5,$6)",
      [manifest, workspace, repo, actor, { commitSha: commit }, "b".repeat(64)],
    );
    await pool.query(
      "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha,status) VALUES($1,$2,$3,$4,$5,'main',$6,'completed')",
      [job, workspace, repo, manifest, actor, commit],
    );
    const first = randomUUID();
    await enqueue(first);
    assert.equal(
      (
        await Promise.all([runOneExportJob(pool), runOneExportJob(pool)])
      ).filter(Boolean).length,
      1,
    );
    const stored = await pool.query<{ payload: string; hash: string }>(
      "SELECT payload,hash FROM export_artifacts WHERE export_job_id=$1",
      [first],
    );
    assert.equal(stored.rowCount, 1);
    assert.equal(stored.rows[0].payload, artifact.content);
    assert.equal(
      stored.rows[0].hash,
      createHash("sha256").update(artifact.content).digest("hex"),
    );
    assert.equal(
      (await pool.query("SELECT status FROM export_jobs WHERE id=$1", [first]))
        .rows[0].status,
      "completed",
    );
    const corrupt = randomUUID();
    await enqueue(corrupt, {
      ...binding,
      artifact: { ...artifact, content: "tampered" },
    });
    await runOneExportJob(pool);
    assert.equal(
      (
        await pool.query("SELECT error_message FROM export_jobs WHERE id=$1", [
          corrupt,
        ])
      ).rows[0].error_message,
      "EXPORT_BINDING_INVALID",
    );
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM export_artifacts WHERE export_job_id=$1",
          [corrupt],
        )
      ).rowCount,
      0,
    );
    const revoked = randomUUID();
    await enqueue(revoked);
    await pool.query(
      "UPDATE github_installations SET connected=false WHERE id=$1",
      [installation],
    );
    await runOneExportJob(pool);
    assert.equal(
      (
        await pool.query("SELECT error_message FROM export_jobs WHERE id=$1", [
          revoked,
        ])
      ).rows[0].error_message,
      "UNAUTHORIZED",
    );
    await pool.query(
      "UPDATE github_installations SET connected=true WHERE id=$1",
      [installation],
    );
    const legacy = randomUUID();
    await enqueue(legacy, null);
    await runOneExportJob(pool);
    assert.equal(
      (
        await pool.query("SELECT error_message FROM export_jobs WHERE id=$1", [
          legacy,
        ])
      ).rows[0].error_message,
      "EXPORT_BINDING_REQUIRED",
    );
    const member = randomUUID();
    await enqueue(member);
    await pool.query(
      "UPDATE organization_members SET role='member' WHERE organization_id=$1",
      [workspace],
    );
    await pool.query(
      "INSERT INTO workspace_controls(organization_id,allow_member_exports) VALUES($1,false)",
      [workspace],
    );
    await runOneExportJob(pool);
    assert.equal(
      (
        await pool.query("SELECT error_message FROM export_jobs WHERE id=$1", [
          member,
        ])
      ).rows[0].error_message,
      "UNAUTHORIZED",
    );
    assert.equal(await runOneExportJob(pool), false);
  } finally {
    await pool.query("DELETE FROM export_jobs WHERE organization_id=$1", [
      workspace,
    ]);
    await pool.query(
      "DELETE FROM workspace_controls WHERE organization_id=$1",
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
    await pool.query("DELETE FROM app_users WHERE id=$1", [actor]);
    await pool.end();
  }
});
