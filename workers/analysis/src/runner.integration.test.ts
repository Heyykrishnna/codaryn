import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { fork } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  access,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "tar";
import { Pool } from "pg";
import { AnalysisProcessor } from "./processor.js";
import { runOneAnalysisJob } from "./runner.js";
test(
  "actual analysis consumes pinned archives isolates artifact identities and recovers after process death",
  { timeout: 60000 },
  async () => {
    assert.ok(process.env.DATABASE_URL);
    const pool = new Pool({ connectionString: process.env.DATABASE_URL }),
      actor = randomUUID(),
      workspace = randomUUID(),
      repo = randomUUID(),
      manifest = randomUUID(),
      job = randomUUID(),
      second = randomUUID(),
      revoked = randomUUID(),
      installation = Math.floor(Math.random() * 1e9),
      commit = "a".repeat(40),
      fixture = await mkdtemp(join(tmpdir(), "codaryn-launch-worker-")),
      sentinel = join(fixture, "must-not-execute"),
      files = {
        "a.ts": "export function a(){return 1}",
        "b.ts": "import {a} from './a'; export function b(){return a()}",
        "page.tsx": "export default function Page(){return <main>Hello</main>}",
        "server.ts":
          "import express from 'express'; const app=express(); app.get('/safe',(_req,res)=>res.send('ok'));",
        "package.json": JSON.stringify({
          scripts: {
            preinstall: `touch ${sentinel}`,
            build: `touch ${sentinel}`,
          },
        }),
      };
    const queue = async (id: string) =>
      pool.query(
        "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha,status) VALUES($1,$2,$3,$4,$5,'main',$6,'queued')",
        [id, workspace, repo, manifest, actor, commit],
      );
    try {
      await mkdir(join(fixture, "source"));
      for (const [path, content] of Object.entries(files))
        await writeFile(join(fixture, "source", path), content);
      await create(
        { cwd: fixture, file: join(fixture, "fixture.tgz"), gzip: true },
        ["source"],
      );
      const archive = await readFile(join(fixture, "fixture.tgz"));
      const gateway = {
        resolve: async () => commit,
        archive: async (
          _installation: number,
          _repository: string,
          sha: string,
        ) => {
          assert.equal(sha, commit);
          return archive;
        },
      };
      await pool.query("INSERT INTO app_users(id) VALUES($1)", [actor]);
      await pool.query(
        "INSERT INTO organizations(id,name) VALUES($1,'Worker release fixture')",
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
        "INSERT INTO connected_repositories(id,installation_id,github_id,full_name,private,default_branch) VALUES($1,$2,1,'release/private',true,'main')",
        [repo, installation],
      );
      await pool.query(
        "INSERT INTO analysis_manifests(id,organization_id,repository_id,actor_id,manifest,hash) VALUES($1,$2,$3,$4,$5,$6)",
        [
          manifest,
          workspace,
          repo,
          actor,
          { commitSha: commit },
          "b".repeat(64),
        ],
      );
      await queue(job);
      await new AnalysisProcessor(pool).processJob(
        { jobId: job, files },
        async () => undefined,
      );
      assert.equal(
        (
          await pool.query("SELECT status FROM analysis_jobs WHERE id=$1", [
            job,
          ])
        ).rows[0].status,
        "completed",
      );
      const nodes = await pool.query<{ id: string; path: string }>(
        "SELECT id,path FROM analysis_graph_nodes WHERE job_id=$1",
        [job],
      );
      assert.ok(nodes.rowCount && nodes.rowCount > 1);
      assert.ok(nodes.rows.every((node) => node.id.startsWith(job + ":")));
      await pool.query(
        "UPDATE analysis_graph_nodes SET name='poisonedFixture' WHERE job_id=$1",
        [job],
      );
      await pool.query("UPDATE analysis_jobs SET status='queued' WHERE id=$1", [
        job,
      ]);
      await runOneAnalysisJob(pool, gateway);
      assert.equal(
        (
          await pool.query(
            "SELECT id FROM analysis_graph_nodes WHERE job_id=$1 AND name='poisonedFixture'",
            [job],
          )
        ).rowCount,
        0,
      );
      assert.equal(
        (
          await pool.query(
            "SELECT id FROM analysis_graph_nodes WHERE job_id=$1",
            [job],
          )
        ).rowCount,
        nodes.rowCount,
      );
      await queue(second);
      const child = fork(new URL("./runner.fixture.js", import.meta.url), {
        env: { ...process.env },
        stdio: ["ignore", "ignore", "inherit", "ipc"],
      });
      try {
        await Promise.race([
          once(child, "message"),
          new Promise((_, reject) => {
            const timer = setTimeout(
              () => reject(new Error("Worker did not claim fixture")),
              10000,
            );
            timer.unref();
          }),
        ]);
        child.kill("SIGKILL");
        await once(child, "exit");
      } finally {
        if (child.exitCode === null && child.signalCode === null)
          child.kill("SIGKILL");
      }
      await pool.query(
        "UPDATE analysis_jobs SET lease_at=now()-interval '6 minutes' WHERE id=$1",
        [second],
      );
      const results = await Promise.all([
        runOneAnalysisJob(pool, gateway),
        runOneAnalysisJob(pool, gateway),
      ]);
      assert.equal(results.filter(Boolean).length, 1);
      const status = await pool.query(
        "SELECT status,retries,lease_id FROM analysis_jobs WHERE id=$1",
        [second],
      );
      assert.equal(status.rows[0].status, "completed");
      assert.equal(status.rows[0].retries, 2);
      assert.equal(status.rows[0].lease_id, null);
      const after = await pool.query(
        "SELECT id FROM analysis_graph_nodes WHERE job_id=$1",
        [second],
      );
      assert.equal(after.rowCount, nodes.rowCount);
      assert.ok(
        after.rows.every((node: { id: string }) =>
          node.id.startsWith(second + ":"),
        ),
      );
      await assert.rejects(access(sentinel));
      await queue(revoked);
      await pool.query(
        "UPDATE github_installations SET connected=false,generation=2 WHERE id=$1",
        [installation],
      );
      await runOneAnalysisJob(pool, gateway);
      assert.equal(
        (
          await pool.query(
            "SELECT failure_reason FROM analysis_jobs WHERE id=$1",
            [revoked],
          )
        ).rows[0].failure_reason,
        "ACCESS_REVOKED",
      );
      assert.equal(
        (
          await pool.query("SELECT id FROM analysis_files WHERE job_id=$1", [
            revoked,
          ])
        ).rowCount,
        0,
      );
      assert.equal(await runOneAnalysisJob(pool, gateway), false);
    } finally {
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
      await pool.query("DELETE FROM app_users WHERE id=$1", [actor]);
      await pool.end();
      await rm(fixture, { recursive: true, force: true });
    }
  },
);
