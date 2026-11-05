import { AnalysisService, AnalysisServiceError } from "../analysis/service.js";
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID, createHmac } from "node:crypto";
import { Pool } from "pg";
import { buildApp } from "../app.js";
import { GraphService } from "../graph/service.js";
import { registerGraph } from "../graph/routes.js";
import { FrontendService } from "../frontend/service.js";
import { registerFrontend } from "../frontend/routes.js";
import { BackendService } from "../backend/service.js";
import { registerBackend } from "../backend/routes.js";
import { RequestBudget } from "./ingress.js";
test(
  "release isolation progressive graph rate limits observability and load budgets",
  { timeout: 60000 },
  async () => {
    assert.ok(process.env.DATABASE_URL);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL }),
      owner = randomUUID(),
      outsider = randomUUID(),
      workspace = randomUUID(),
      repo = randomUUID(),
      manifest = randomUUID(),
      job = randomUUID(),
      installation = Math.floor(Math.random() * 1e9),
      origin = "http://localhost:3000",
      token = "release-fixture-operations-token-32-characters",
      app = buildApp({ pool, secret: token, token, origin }),
      auth = {
        api: {
          getSession: async ({ headers }: { headers: Headers }) => {
            const id = headers.get("x-test-user");
            return id
              ? { user: { id }, session: { createdAt: new Date() } }
              : null;
          },
        },
      };
    registerGraph(app, auth, new GraphService(pool), origin);
    registerFrontend(app, auth, new FrontendService(pool), origin);
    registerBackend(app, auth, new BackendService(pool), origin);
    const request = (scope: string, actor: string = owner, wsp = workspace) =>
      app.inject({
        url: `/api/v1/${scope}?workspaceId=${wsp}&jobId=${job}`,
        headers: actor ? { "x-test-user": actor } : {},
      });
    try {
      await pool.query("INSERT INTO app_users(id) VALUES($1),($2)", [
        owner,
        outsider,
      ]);
      await pool.query(
        "INSERT INTO organizations(id,name) VALUES($1,'Release fixture')",
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
        "INSERT INTO connected_repositories(id,installation_id,github_id,full_name,private,default_branch) VALUES($1,$2,1,'release/private',true,'main')",
        [repo, installation],
      );
      await pool.query(
        "INSERT INTO analysis_manifests(id,organization_id,repository_id,actor_id,manifest,hash) VALUES($1,$2,$3,$4,$5,$6)",
        [
          manifest,
          workspace,
          repo,
          owner,
          { commitSha: "a".repeat(40) },
          "b".repeat(64),
        ],
      );
      await pool.query(
        "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha,status) VALUES($1,$2,$3,$4,$5,'main',$6,'completed')",
        [job, workspace, repo, manifest, owner, "a".repeat(40)],
      );
      await pool.query(
        "INSERT INTO analysis_graph_nodes(id,job_id,kind,path,name) SELECT $1||':'||n,$1::uuid,'file','src/'||lpad(n::text,5,'0')||'.ts','module'||n FROM generate_series(1,10000) n",
        [job],
      );
      await pool.query(
        "INSERT INTO analysis_graph_edges(id,job_id,source_id,target_id,kind,resolution,evidence,weight) SELECT $1||':edge:'||n,$1::uuid,$1||':'||n,$1||':'||(n+1),'imports','INFERRED','[]',1 FROM generate_series(1,9999) n",
        [job],
      );
      for (const route of [
        "graph/snapshot",
        "graph/neighborhood",
        "graph/cycles",
        "graph/metrics",
        "graph/unresolved",
        "frontend/overview",
        "frontend/components",
        "backend/overview",
        "backend/routes",
      ]) {
        assert.equal((await request(route, "")).statusCode, 401, route);
        assert.equal((await request(route, outsider)).statusCode, 404, route);
        assert.equal(
          (await request(route, owner, randomUUID())).statusCode,
          404,
          route,
        );
      }
      const first = await request("graph/snapshot");
      assert.equal(first.statusCode, 200, first.body);
      assert.equal(first.headers["cache-control"], "no-store");
      assert.equal(first.json().nodes.length, 200);
      assert.equal(first.json().totalNodes, 10000);
      assert.ok(first.json().hasMore);
      assert.ok(first.body.length < 1048576);
      assert.ok(first.json().edges.length <= 400);
      const second = await app.inject({
        url: `/api/v1/graph/snapshot?workspaceId=${workspace}&jobId=${job}&page=2`,
        headers: { "x-test-user": owner },
      });
      assert.equal(second.statusCode, 200, second.body);
      assert.ok(
        !second
          .json()
          .nodes.some((n: { id: string }) =>
            first
              .json()
              .nodes.some((prior: { id: string }) => prior.id === n.id),
          ),
      );
      const search = await app.inject({
        url: `/api/v1/graph/snapshot?workspaceId=${workspace}&jobId=${job}&search=module9999`,
        headers: { "x-test-user": owner },
      });
      assert.equal(search.json().nodes.length, 1);
      const neighbors = await app.inject({
        url: `/api/v1/graph/neighborhood?workspaceId=${workspace}&jobId=${job}&nodeId=${job}:1&depth=5`,
        headers: { "x-test-user": owner },
      });
      assert.equal(neighbors.statusCode, 200, neighbors.body);
      assert.ok(neighbors.json().nodes.length <= 200);
      assert.ok(neighbors.json().edges.length <= 400);
      assert.equal((await request("frontend/overview")).statusCode, 200);
      assert.equal((await request("backend/overview")).statusCode, 200);
      await pool.query(
        "UPDATE connected_repositories SET active=false WHERE id=$1",
        [repo],
      );
      assert.equal((await request("graph/snapshot")).statusCode, 404);
      await pool.query(
        "UPDATE connected_repositories SET active=true WHERE id=$1",
        [repo],
      );
      await pool.query(
        "DELETE FROM organization_members WHERE organization_id=$1",
        [workspace],
      );
      assert.equal((await request("graph/snapshot")).statusCode, 404);
      await pool.query(
        "INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')",
        [workspace, owner],
      );
      const a = new RequestBudget(pool, token),
        b = new RequestBudget(pool, token),
        ip = randomUUID();
      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) =>
          (i % 2 ? a : b).consume(ip, "shared-fixture", 5),
        ),
      );
      assert.equal(results.filter((r) => r.allowed).length, 5);
      assert.ok(results.every((r) => r.retryAfter > 0));
      assert.equal(
        (await app.inject({ url: "/api/v1/operations/metrics" })).statusCode,
        404,
      );
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/operations/client",
            headers: { origin },
            payload: { name: "LCP", value: 100, path: "private" },
          })
        ).statusCode,
        400,
      );
      assert.equal(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/operations/client",
            headers: { origin },
            payload: { name: "LCP", value: 100 },
          })
        ).statusCode,
        204,
      );
      const metrics = await app.inject({
        url: "/api/v1/operations/metrics",
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(metrics.statusCode, 200);
      assert.ok(!metrics.body.includes(workspace));
      assert.ok(!metrics.body.includes(owner));
      assert.equal(
        (await app.inject({ url: "/api/v1/ready" })).statusCode,
        200,
      );
      const address = await app.listen({ host: "127.0.0.1", port: 0 }),
        durations: number[] = [];
      await Promise.all(
        Array.from({ length: 10 }, async () => {
          for (let i = 0; i < 20; i++) {
            const start = performance.now(),
              response = await fetch(
                `${address}/api/v1/graph/snapshot?workspaceId=${workspace}&jobId=${job}`,
                { headers: { "x-test-user": owner } },
              );
            assert.equal(response.status, 200);
            await response.arrayBuffer();
            durations.push(performance.now() - start);
          }
        }),
      );
      durations.sort((a, b) => a - b);
      const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
      assert.ok(p95 < 2000, `p95 ${p95}ms exceeds budget`);
      console.log(
        JSON.stringify({
          measurement: "graph-load",
          nodes: 10000,
          requests: 200,
          concurrency: 10,
          p95Ms: p95,
          responseBytes: Buffer.byteLength(first.body),
          runtime: process.version,
        }),
      );
      const rateKey = createHmac("sha256", token)
        .update("graph:127.0.0.1")
        .digest("hex");
      await pool.query(
        "INSERT INTO api_request_budgets(key,window_id,count) VALUES($1,$2,240) ON CONFLICT(key,window_id) DO UPDATE SET count=240",
        [rateKey, Math.floor(Date.now() / 60000)],
      );
      const limited = await request("graph/snapshot");
      assert.equal(limited.statusCode, 429);
      assert.ok(Number(limited.headers["retry-after"]) >= 1);
      await pool.query(
        "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha) SELECT gen_random_uuid(),$1,$2,$3,$4,'main',$5 FROM generate_series(1,20)",
        [workspace, repo, manifest, owner, "a".repeat(40)],
      );
      await assert.rejects(
        new AnalysisService(pool).startJob(
          owner,
          workspace,
          manifest,
          repo,
          "main",
        ),
        (error) =>
          error instanceof AnalysisServiceError && error.code === "QUEUE_FULL",
      );
      await pool.query(
        "DELETE FROM analysis_jobs WHERE organization_id=$1 AND id<>$2",
        [workspace, job],
      );
      await pool.query("ANALYZE analysis_graph_nodes");
      const plan = await pool.query(
        "EXPLAIN (FORMAT JSON) SELECT id,path FROM analysis_graph_nodes WHERE job_id=$1 ORDER BY path,id LIMIT 200",
        [job],
      );
      console.log(
        JSON.stringify({ measurement: "graph-page-plan", plan: plan.rows[0] }),
      );
      const counts = await pool.query<{ count: string }>(
        "SELECT count(*) FROM api_request_budgets WHERE key !~ '^[a-f0-9]{64}$'",
      );
      assert.equal(counts.rows[0].count, "0");
    } finally {
      await app.close();
      await pool.query("DELETE FROM analysis_jobs WHERE organization_id=$1", [
        workspace,
      ]);
      await pool.query("DELETE FROM analysis_manifests WHERE id=$1", [
        manifest,
      ]);
      await pool.query("DELETE FROM connected_repositories WHERE id=$1", [
        repo,
      ]);
      await pool.query("DELETE FROM github_installations WHERE id=$1", [
        installation,
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
  },
);
