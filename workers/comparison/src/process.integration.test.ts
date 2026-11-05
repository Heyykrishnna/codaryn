import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "tar";
import { Pool } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { versionSnapshotSchema, studioDefaults } from "@codaryn/contracts";
import { runOneVersionRequest } from "./process.js";
test("version worker reads pinned archives, persists evidence, avoids duplicate claims and denies revoked access", async () => {
  assert.ok(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const actor = randomUUID(),
    workspace = randomUUID(),
    repo = randomUUID(),
    manifest = randomUUID(),
    job = randomUUID(),
    snapshot = randomUUID(),
    revoked = randomUUID();
  const installation = Math.floor(Math.random() * 1000000000) + 1;
  const commit = "a".repeat(40);
  const fixture = await mkdtemp(join(tmpdir(), "codaryn-version-test-"));
  let downloads = 0;
  let revokeDuringDownload = false;
  let disablePolicyDuringDownload = false;
  let resolvedSha = commit;
  try {
    await mkdir(join(fixture, "source"));
    await writeFile(
      join(fixture, "source/schema.sql"),
      "CREATE TABLE users (id integer PRIMARY KEY); CREATE TABLE posts (id int PRIMARY KEY,user_id int REFERENCES users(id));",
    );
    await create(
      { cwd: fixture, file: join(fixture, "fixture.tgz"), gzip: true },
      ["source"],
    );
    const archive = await readFile(join(fixture, "fixture.tgz"));
    const github: GitHubGateway = {
      verifyInstallation: async () => {},
      repositories: async () => [],
      branches: async () => [],
      commits: async () => [],
      resolve: async () => resolvedSha,
      archive: async (_installation, _repository, sha) => {
        assert.equal(sha, commit);
        downloads++;
        if (revokeDuringDownload)
          await pool.query(
            "UPDATE github_installations SET connected=false,generation=2 WHERE id=$1",
            [installation],
          );
        if (disablePolicyDuringDownload)
          await pool.query(
            "UPDATE repository_analysis_policies SET enabled=false WHERE repository_id=$1",
            [repo],
          );
        return archive;
      },
    };
    await pool.query("INSERT INTO app_users(id) VALUES ($1)", [actor]);
    await pool.query(
      "INSERT INTO organizations(id,name) VALUES ($1,'Schema Worker')",
      [workspace],
    );
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner')",
      [workspace, actor],
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
      [
        manifest,
        workspace,
        repo,
        actor,
        {
          version: 1,
          registryVersion: "fixture",
          repositoryId: repo,
          commitSha: commit,
          configuration: studioDefaults,
          analyzers: [],
        },
        "b".repeat(64),
      ],
    );
    await pool.query(
      "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha) VALUES ($1,$2,$3,$4,$5,'refs/heads/main',$6)",
      [job, workspace, repo, manifest, actor, commit],
    );
    const enqueue = (id: string) =>
      pool.query(
        "INSERT INTO analysis_version_snapshots(id,job_id,organization_id,repository_id,actor_id,commit_sha,installation_generation) VALUES ($1,$2,$3,$4,$5,$6,1)",
        [id, job, workspace, repo, actor, commit],
      );
    await enqueue(snapshot);
    const claims = await Promise.all([
      runOneVersionRequest(pool, github),
      runOneVersionRequest(pool, github),
    ]);
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(downloads, 1);
    const completed = (
      await pool.query<{ status: string; hash: string; snapshot: unknown }>(
        "SELECT status,hash,snapshot FROM analysis_version_snapshots WHERE id=$1",
        [snapshot],
      )
    ).rows[0];
    assert.equal(completed.status, "completed");
    const parsed = versionSnapshotSchema.parse(completed.snapshot);
    assert.equal(parsed.files.length, 1);
    assert.equal(
      parsed.schema.filter((item) => item.kind === "table").length,
      2,
    );
    assert.ok(parsed.schema.some((item) => item.kind === "relation"));
    assert.equal(parsed.files[0].path, "schema.sql");
    assert.match(completed.hash, /^[a-f0-9]{64}$/);
    assert.equal(await runOneVersionRequest(pool, github), false);
    await pool.query(
      "INSERT INTO repository_analysis_policies(repository_id,organization_id,manifest_id,actor_id,ref,enabled) VALUES($1,$2,$3,$4,'refs/heads/main',true)",
      [repo, workspace, manifest, actor],
    );
    const automatic = randomUUID();
    await enqueue(automatic);
    await pool.query(
      "UPDATE analysis_version_snapshots SET trigger_key=$2 WHERE id=$1",
      [automatic, "fixture:" + automatic],
    );
    disablePolicyDuringDownload = true;
    await runOneVersionRequest(pool, github);
    const cancelledPolicy = await pool.query(
      "SELECT failure_code,snapshot FROM analysis_version_snapshots WHERE id=$1",
      [automatic],
    );
    assert.equal(cancelledPolicy.rows[0].failure_code, "ACCESS_REVOKED");
    assert.equal(cancelledPolicy.rows[0].snapshot, null);
    disablePolicyDuringDownload = false;
    await pool.query(
      "UPDATE repository_analysis_policies SET enabled=true WHERE repository_id=$1",
      [repo],
    );
    const verified = randomUUID();
    await enqueue(verified);
    await pool.query(
      "UPDATE analysis_version_snapshots SET trigger_key=$2,base_snapshot_id=$3,verify_full=true WHERE id=$1",
      [verified, "fixture:" + verified, snapshot],
    );
    await runOneVersionRequest(pool, github);
    const verifiedRow = await pool.query<{ snapshot: unknown; status: string }>(
      "SELECT snapshot,status FROM analysis_version_snapshots WHERE id=$1",
      [verified],
    );
    assert.equal(verifiedRow.rows[0].status, "completed");
    assert.equal(
      versionSnapshotSchema.parse(verifiedRow.rows[0].snapshot).reuse.reused,
      1,
    );
    assert.equal(
      versionSnapshotSchema.parse(verifiedRow.rows[0].snapshot).reuse
        .verification,
      "matched",
    );
    assert.equal(
      (await pool.query("SELECT status FROM analysis_jobs WHERE id=$1", [job]))
        .rows[0].status,
      "completed",
    );
    await enqueue(revoked);
    await pool.query(
      "UPDATE github_installations SET connected=false,generation=2 WHERE id=$1",
      [installation],
    );
    await runOneVersionRequest(pool, github);
    assert.equal(downloads, 3);
    const denied = (
      await pool.query(
        "SELECT status,snapshot,failure_code FROM analysis_version_snapshots WHERE id=$1",
        [revoked],
      )
    ).rows[0];
    assert.equal(denied.status, "failed");
    assert.equal(denied.failure_code, "ACCESS_REVOKED");
    assert.equal(denied.snapshot, null);
    await pool.query(
      "UPDATE github_installations SET connected=true,generation=1 WHERE id=$1",
      [installation],
    );
    const midflight = randomUUID();
    await enqueue(midflight);
    revokeDuringDownload = true;
    await runOneVersionRequest(pool, github);
    const blocked = (
      await pool.query(
        "SELECT status,snapshot,failure_code FROM analysis_version_snapshots WHERE id=$1",
        [midflight],
      )
    ).rows[0];
    assert.equal(blocked.status, "failed");
    assert.equal(blocked.failure_code, "ACCESS_REVOKED");
    assert.equal(blocked.snapshot, null);
    revokeDuringDownload = false;
    await pool.query(
      "UPDATE github_installations SET connected=true,generation=1 WHERE id=$1",
      [installation],
    );
    const mismatch = randomUUID();
    await enqueue(mismatch);
    resolvedSha = "b".repeat(40);
    await runOneVersionRequest(pool, github);
    assert.equal(
      (
        await pool.query(
          "SELECT failure_code FROM analysis_version_snapshots WHERE id=$1",
          [mismatch],
        )
      ).rows[0].failure_code,
      "COMMIT_MISMATCH",
    );
    const expired = randomUUID();
    await enqueue(expired);
    await pool.query(
      "UPDATE analysis_version_snapshots SET status='running',attempts=3,lease_id=$2,lease_at=now()-interval '6 minutes' WHERE id=$1",
      [expired, randomUUID()],
    );
    assert.equal(await runOneVersionRequest(pool, github), false);
    assert.equal(
      (
        await pool.query(
          "SELECT failure_code FROM analysis_version_snapshots WHERE id=$1",
          [expired],
        )
      ).rows[0].failure_code,
      "LEASE_EXPIRED",
    );
  } finally {
    await pool.query(
      "DELETE FROM repository_analysis_policies WHERE organization_id=$1",
      [workspace],
    );
    await pool.query(
      "DELETE FROM analysis_version_snapshots WHERE organization_id=$1",
      [workspace],
    );
    await pool.query("DELETE FROM analysis_jobs WHERE id=$1", [job]);
    await pool.query("DELETE FROM analysis_manifests WHERE id=$1", [manifest]);
    await pool.query("DELETE FROM connected_repositories WHERE id=$1", [repo]);
    await pool.query("DELETE FROM github_installations WHERE id=$1", [
      installation,
    ]);
    await pool.query(
      "DELETE FROM organization_members WHERE organization_id=$1",
      [workspace],
    );
    await pool.query("DELETE FROM organizations WHERE id=$1", [workspace]);
    await pool.query("DELETE FROM app_users WHERE id=$1", [actor]);
    await pool.end();
    await rm(fixture, { recursive: true, force: true });
  }
});
