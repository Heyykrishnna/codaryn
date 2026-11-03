import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { WorkspaceService } from "@codaryn/database";
import { buildApp } from "../app.js";
import { registerAnalysis } from "./routes.js";
import { AnalysisService } from "./service.js";

const origin = "http://localhost:3000";

test("analysis endpoints enforce authorization, job lifecycle, and inventory inspection", async () => {
  if (!process.env.DATABASE_URL) return;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const owner = randomUUID();
  const outsider = randomUUID();
  const repoId = randomUUID();
  const manifestId = randomUUID();
  const installation = Math.floor(Math.random() * 1000000000) + 1;
  let workspace = "";

  const app = buildApp();
  const service = new AnalysisService(pool);

  const session = (user: string) => ({
    user: { id: user },
    session: {
      id: "test",
      userId: user,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 60000),
      token: "test",
    },
  });

  registerAnalysis(
    app,
    {
      api: {
        getSession: async ({ headers }) => {
          const actor = headers?.get("x-test-user");
          return actor ? session(actor) : null;
        },
      },
    },
    service,
    origin,
  );

  try {
    await pool.query(
      "INSERT INTO app_users (id) VALUES ($1), ($2) ON CONFLICT (id) DO NOTHING",
      [owner, outsider],
    );

    const ws = new WorkspaceService(pool);
    const org = await ws.create(owner, "Analysis Test Org");
    workspace = org.id;

    await pool.query(
      "INSERT INTO github_installations (id,organization_id) VALUES ($1,$2)",
      [installation, workspace],
    );

    await pool.query(
      "INSERT INTO connected_repositories (id,installation_id,github_id,full_name,private,default_branch) VALUES ($1,$2,$3,$4,false,'main')",
      [repoId, installation, installation + 1, "owner/repo"],
    );

    await pool.query(
      "INSERT INTO analysis_manifests (id,organization_id,repository_id,actor_id,manifest,hash,status) VALUES ($1,$2,$3,$4,$5,$6,'configured')",
      [
        manifestId,
        workspace,
        repoId,
        owner,
        JSON.stringify({ commitSha: "a".repeat(40) }),
        "b".repeat(64),
      ],
    );

    const headersFor = (actor: string) => ({
      "x-test-user": actor,
      origin,
      "x-codaryn-request": "workspace",
    });

    const forbidden = await app.inject({
      method: "POST",
      url: "/api/v1/analysis/start",
      headers: headersFor(outsider),
      payload: {
        workspaceId: workspace,
        repositoryId: repoId,
        manifestId,
        ref: "main",
      },
    });
    assert.equal(forbidden.statusCode, 403);

    const started = await app.inject({
      method: "POST",
      url: "/api/v1/analysis/start",
      headers: headersFor(owner),
      payload: {
        workspaceId: workspace,
        repositoryId: repoId,
        manifestId,
        ref: "main",
      },
    });
    assert.equal(started.statusCode, 201);
    const job = started.json();
    assert.equal(job.status, "queued");
    assert.equal(job.currentStage, "inventory");
    assert.equal(job.stages.length, 5);

    const fetched = await app.inject({
      method: "GET",
      url: `/api/v1/analysis/job?jobId=${job.id}&workspaceId=${workspace}`,
      headers: headersFor(owner),
    });
    assert.equal(fetched.statusCode, 200);
    assert.equal(fetched.json().id, job.id);

    const cancelled = await app.inject({
      method: "POST",
      url: "/api/v1/analysis/cancel",
      headers: headersFor(owner),
      payload: {
        workspaceId: workspace,
        jobId: job.id,
      },
    });
    assert.equal(cancelled.statusCode, 200);
    assert.equal(cancelled.json().status, "cancelled");

    const inventory = await app.inject({
      method: "GET",
      url: `/api/v1/analysis/inventory?jobId=${job.id}&workspaceId=${workspace}`,
      headers: headersFor(owner),
    });
    assert.equal(inventory.statusCode, 200);
    assert.equal(inventory.json().files.length, 0);

    const symbols = await app.inject({
      method: "GET",
      url: `/api/v1/analysis/symbols?jobId=${job.id}&workspaceId=${workspace}`,
      headers: headersFor(owner),
    });
    assert.equal(symbols.statusCode, 200);
    assert.equal(symbols.json().totalCount, 0);
  } finally {
    if (workspace) {
      await pool.query("DELETE FROM organizations WHERE id=$1", [workspace]);
    }
    await pool.end();
  }
});
