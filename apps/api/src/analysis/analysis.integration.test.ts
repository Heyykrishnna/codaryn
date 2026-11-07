import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { WorkspaceService } from "@codaryn/database";
import { buildApp } from "../app.js";
import { registerAnalysis } from "./routes.js";
import { AnalysisService } from "./service.js";
import { registerDiagrams } from "../diagrams/routes.js";
import { DiagramService } from "../diagrams/service.js";
import {
  architectureAtlasSchema,
  atlasJobListSchema,
} from "@codaryn/contracts";

const origin = "http://localhost:3000";

test("analysis endpoints enforce authorization, job lifecycle, and inventory inspection", async () => {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile();
    } catch {}
    try {
      process.loadEnvFile(new URL("../../../../.env", import.meta.url));
    } catch {}
  }
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

  const auth = {
    api: {
      getSession: async ({ headers }: { headers: Headers }) => {
        const actor = headers.get("x-test-user");
        return actor ? session(actor) : null;
      },
    },
  };
  registerAnalysis(app, auth, service, origin);
  registerDiagrams(app, auth, new DiagramService(pool), origin);

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
    assert.equal(job.stages.length, 6);

    const fetched = await app.inject({
      method: "GET",
      url: `/api/v1/analysis/job?jobId=${job.id}&workspaceId=${workspace}`,
      headers: headersFor(owner),
    });
    assert.equal(fetched.statusCode, 200);
    assert.equal(fetched.json().id, job.id);

    const repeated = await service.startJob(
      owner,
      workspace,
      manifestId,
      repoId,
      "main",
      true,
    );
    assert.equal(repeated.id, job.id);

    const atlasUrl = `/api/v1/workspaces/${workspace}/analysis/${job.id}/atlas`;
    const atlasRead = (actor: string) =>
      app.inject({ url: atlasUrl, headers: headersFor(actor) });
    assert.equal((await atlasRead(owner)).statusCode, 409);
    assert.equal((await atlasRead(outsider)).statusCode, 404);

    const jobs = await app.inject({
      url: `/api/v1/analysis/jobs?workspaceId=${workspace}&repositoryId=${repoId}`,
      headers: headersFor(owner),
    });
    assert.equal(atlasJobListSchema.parse(jobs.json()).jobs[0]?.id, job.id);

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
    const replacement = await service.startJob(
      owner,
      workspace,
      manifestId,
      repoId,
      "main",
    );
    const source = `${replacement.id}:node:file:apps/api/index.ts`;
    const target = `${replacement.id}:node:file:packages/db/client.ts`;
    await pool.query(
      "INSERT INTO analysis_graph_nodes(id,job_id,kind,path,name) VALUES ($1,$3,'file','apps/api/index.ts','index.ts'),($2,$3,'file','packages/db/client.ts','client.ts')",
      [source, target, replacement.id],
    );
    await pool.query(
      "INSERT INTO analysis_graph_edges(id,job_id,source_id,target_id,kind,resolution,evidence) VALUES ($1,$2,$3,$4,'imports','RESOLVED',$5)",
      [
        randomUUID(),
        replacement.id,
        source,
        target,
        JSON.stringify([
          { path: "apps/api/index.ts", startLine: 2, endLine: 2 },
        ]),
      ],
    );
    await pool.query(
      "INSERT INTO analysis_backend_routes(id,job_id,framework,method,path,file_path,handler_name,middleware,source_evidence) VALUES($1,$2,'express','GET','/health','apps/api/index.ts','health',ARRAY['authenticate'],$3)",
      [
        randomUUID(),
        replacement.id,
        JSON.stringify({ path: "apps/api/index.ts", startLine: 6, endLine: 7 }),
      ],
    );
    await pool.query(
      "UPDATE analysis_jobs SET status='completed', current_stage='completed', completed_at=now(),file_count=2 WHERE id=$1",
      [replacement.id],
    );
    const finishedUrl = `/api/v1/workspaces/${workspace}/analysis/${replacement.id}/atlas`;
    const completed = await app.inject({
      url: finishedUrl,
      headers: headersFor(owner),
    });
    assert.equal(completed.statusCode, 200, completed.body);
    const atlas = architectureAtlasSchema.parse(completed.json());
    assert.equal(atlas.layers.files.edges[0]?.evidence?.startLine, 2);
    assert.deepEqual(
      atlas.layers.services.nodes.map((node) => node.title),
      ["apps/api", "packages/db"],
    );
    assert.equal(atlas.layers.services.edges.length, 1);
    assert.equal(
      atlas.layers.sequences.nodes.find((node) => node.kind === "Middleware")
        ?.title,
      "authenticate",
    );
    assert.equal(atlas.layers.sequences.edges.length, 2);
    assert.equal(atlas.health.files, 2);
    assert.equal(atlas.tour.length, 1);

    await pool.query(
      "UPDATE github_installations SET connected=false WHERE id=$1",
      [installation],
    );
    assert.equal(
      (await app.inject({ url: finishedUrl, headers: headersFor(owner) }))
        .statusCode,
      404,
    );
  } finally {
    if (workspace) {
      await pool.query("DELETE FROM audit_events WHERE organization_id=$1", [
        workspace,
      ]);
      await pool.query(
        "DELETE FROM analysis_stages WHERE job_id IN (SELECT id FROM analysis_jobs WHERE organization_id=$1)",
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
      await pool.query(
        "DELETE FROM github_installations WHERE organization_id=$1",
        [workspace],
      );
      await pool.query(
        "DELETE FROM organization_members WHERE organization_id=$1",
        [workspace],
      );
      await pool.query("DELETE FROM organizations WHERE id=$1", [workspace]);
    }
    await pool.query("DELETE FROM app_users WHERE id IN ($1, $2)", [
      owner,
      outsider,
    ]);
    await pool.end();
  }
});
