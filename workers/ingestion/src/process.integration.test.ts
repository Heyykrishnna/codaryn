import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "tar";
import { Pool } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { processIngestion } from "./process.js";

test("ingestion persists an immutable inventory, is repeatable, and rejects revoked workspaces", async () => {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile();
    } catch {}
    try {
      process.loadEnvFile(new URL("../../../.env", import.meta.url));
    } catch {}
  }
  assert.ok(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const user = randomUUID(),
    workspace = randomUUID(),
    repo = randomUUID(),
    run = randomUUID(),
    revoked = randomUUID();
  const installation = Math.floor(Math.random() * 1000000000) + 1;
  const sha = "a".repeat(40);
  const fixture = await mkdtemp(join(tmpdir(), "codaryn-worker-test-"));
  let downloads = 0;
  try {
    await mkdir(join(fixture, "source/apps/web"), { recursive: true });
    await writeFile(join(fixture, "source/package.json"), "{}");
    await writeFile(join(fixture, "source/apps/web/package.json"), "{}");
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
      resolve: async () => sha,
      archive: async () => {
        downloads++;
        return archive;
      },
    };
    await pool.query("INSERT INTO app_users(id) VALUES ($1)", [user]);
    await pool.query("INSERT INTO organizations(id,name) VALUES ($1,'Test')", [
      workspace,
    ]);
    await pool.query(
      "INSERT INTO organization_members(organization_id,user_id,role) VALUES ($1,$2,'owner')",
      [workspace, user],
    );
    await pool.query(
      "INSERT INTO github_installations(id,organization_id) VALUES ($1,$2)",
      [installation, workspace],
    );
    await pool.query(
      "INSERT INTO connected_repositories(id,installation_id,github_id,full_name,private,default_branch) VALUES ($1,$2,1,'owner/repo',true,'main')",
      [repo, installation],
    );
    for (const id of [run, revoked])
      await pool.query(
        "INSERT INTO ingestion_runs(id,repository_id,actor_id,commit_sha,installation_generation,status) VALUES ($1,$2,$3,$4,1,'queued')",
        [id, repo, user, sha],
      );
    await processIngestion(pool, github, run);
    await processIngestion(pool, github, run);
    assert.equal(downloads, 1);
    const result = (
      await pool.query<{
        status: string;
        commit_sha: string;
        inventory: { files: { path: string }[]; monorepo: boolean };
      }>("SELECT status,commit_sha,inventory FROM ingestion_runs WHERE id=$1", [
        run,
      ])
    ).rows[0];
    assert.equal(result.status, "completed");
    assert.equal(result.commit_sha, sha);
    assert.equal(result.inventory.monorepo, true);
    assert.deepEqual(
      result.inventory.files.map((file) => file.path),
      ["apps/web/package.json", "package.json"],
    );
    await pool.query(
      "UPDATE github_installations SET connected=false,generation=generation+1 WHERE id=$1",
      [installation],
    );
    await assert.rejects(
      processIngestion(pool, github, revoked),
      /ACCESS_REVOKED/,
    );
    assert.equal(downloads, 1);
    assert.equal(
      (
        await pool.query<{ inventory: unknown }>(
          "SELECT inventory FROM ingestion_runs WHERE id=$1",
          [revoked],
        )
      ).rows[0].inventory,
      null,
    );
  } finally {
    await pool.query("DELETE FROM ingestion_runs WHERE repository_id=$1", [
      repo,
    ]);
    await pool.query("DELETE FROM connected_repositories WHERE id=$1", [repo]);
    await pool.query("DELETE FROM github_installations WHERE id=$1", [
      installation,
    ]);
    await pool.query("DELETE FROM organizations WHERE id=$1", [workspace]);
    await pool.query("DELETE FROM app_users WHERE id=$1", [user]);
    await pool.end();
    await rm(fixture, { recursive: true, force: true });
  }
});
