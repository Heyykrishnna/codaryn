import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID, createHmac } from "node:crypto";
import { Pool } from "pg";
import { ingestionRunListSchema } from "@codaryn/contracts";
import { WorkspaceService, WorkspaceAccessError } from "@codaryn/database";
import type { GitHubGateway } from "@codaryn/github";
import { RepositoryService } from "./service.js";
import { receiveWebhook, validSignature } from "./webhook.js";

const sha = "a".repeat(40);
test("repositories preserve workspace boundaries, immutable selections and webhook revocation", async () => {
  assert.ok(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const owner = randomUUID(),
    other = randomUUID();
  let workspace = "";
  const installation = Math.floor(Math.random() * 1000000000) + 1;
  let visible = true;
  let head = sha;
  const github: GitHubGateway = {
    verifyInstallation: async () => {},
    repositories: async () =>
      visible
        ? [
            {
              id: 1,
              name: "repo",
              full_name: "owner/repo",
              private: true,
              default_branch: "main",
              owner: { login: "owner" },
            },
          ]
        : [],
    branches: async () => [{ name: "main", sha: head }],
    commits: async () => [{ sha: head, message: "commit" }],
    resolve: async (_id, _name, ref) => (ref === "main" ? head : ref),
    archive: async () => Buffer.alloc(0),
  };
  const service = new RepositoryService(pool, github);
  try {
    await pool.query("INSERT INTO app_users (id) VALUES ($1),($2)", [
      owner,
      other,
    ]);
    workspace = (
      await new WorkspaceService(pool).create(owner, "Repository workspace")
    ).id;
    await assert.rejects(
      service.connect(other, workspace, installation, "token"),
      WorkspaceAccessError,
    );
    await service.connect(owner, workspace, installation, "token");
    await service.sync(owner, workspace, installation);
    const repositories = await service.list(owner, workspace, 1);
    assert.equal(repositories.length, 1);
    assert.equal(repositories[0].private, true);
    await assert.rejects(
      service.list(other, workspace, 1),
      WorkspaceAccessError,
    );
    await assert.rejects(
      service.branches(other, workspace, repositories[0].id, 1),
      WorkspaceAccessError,
    );
    const run = await service.ingest(
      owner,
      workspace,
      repositories[0].id,
      "main",
    );
    head = "b".repeat(40);
    assert.equal(run.commitSha, sha);
    assert.equal(
      (
        await pool.query<{ commit_sha: string }>(
          "SELECT commit_sha FROM ingestion_runs WHERE id=$1",
          [run.id],
        )
      ).rows[0].commit_sha,
      sha,
    );
    await pool.query(
      "UPDATE ingestion_runs SET status='completed',inventory=$2 WHERE id=$1",
      [
        run.id,
        JSON.stringify({
          files: [{ path: "a.ts", bytes: 1, sha256: "a".repeat(64) }],
          packageRoots: ["."],
          archiveSha256: "b".repeat(64),
          monorepo: false,
        }),
      ],
    );
    const history = ingestionRunListSchema.parse({
      runs: await service.runs(owner, workspace, repositories[0].id),
    });
    assert.equal(history.runs[0].inventory?.fileCount, 1);
    assert.equal(history.runs[0].commitSha, sha);
    visible = false;
    await service.sync(owner, workspace, installation);
    assert.equal((await service.list(owner, workspace, 1)).length, 0);
    visible = true;
    await service.sync(owner, workspace, installation);
    const secret = "test-webhook-secret";
    const payload = Buffer.from(
      JSON.stringify({ action: "deleted", installation: { id: installation } }),
    );
    const signature = `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;
    const delivery = randomUUID();
    assert.equal(validSignature(secret, payload, "sha256=invalid"), false);
    await assert.rejects(
      receiveWebhook(
        pool,
        secret,
        payload,
        "sha256=invalid",
        "installation",
        delivery,
      ),
    );
    assert.deepEqual(
      await receiveWebhook(
        pool,
        secret,
        payload,
        signature,
        "installation",
        delivery,
      ),
      { duplicate: false },
    );
    const generation = (
      await pool.query<{ generation: number }>(
        "SELECT generation FROM github_installations WHERE id=$1",
        [installation],
      )
    ).rows[0].generation;
    assert.deepEqual(
      await receiveWebhook(
        pool,
        secret,
        payload,
        signature,
        "installation",
        delivery,
      ),
      { duplicate: true },
    );
    assert.equal(
      (
        await pool.query<{ generation: number }>(
          "SELECT generation FROM github_installations WHERE id=$1",
          [installation],
        )
      ).rows[0].generation,
      generation,
    );
    assert.equal((await service.list(owner, workspace, 1)).length, 0);
    await assert.rejects(
      service.ingest(owner, workspace, repositories[0].id, sha),
      WorkspaceAccessError,
    );
    await pool.query("DELETE FROM github_webhook_events WHERE delivery_id=$1", [
      delivery,
    ]);
  } finally {
    await pool.query(
      "DELETE FROM ingestion_runs WHERE repository_id IN (SELECT id FROM connected_repositories WHERE installation_id=$1)",
      [installation],
    );
    await pool.query(
      "DELETE FROM connected_repositories WHERE installation_id=$1",
      [installation],
    );
    await pool.query("DELETE FROM github_installations WHERE id=$1", [
      installation,
    ]);
    if (workspace) {
      await pool.query("DELETE FROM audit_events WHERE organization_id=$1", [
        workspace,
      ]);
      await pool.query("DELETE FROM organizations WHERE id=$1", [workspace]);
    }
    await pool.query("DELETE FROM app_users WHERE id IN ($1,$2)", [
      owner,
      other,
    ]);
    await pool.end();
  }
});
