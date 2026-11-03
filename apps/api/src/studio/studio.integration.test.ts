import { test } from "node:test";
import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { WorkspaceService } from "@codaryn/database";
import {
  studioDefaults,
  studioManifestResponseSchema,
} from "@codaryn/contracts";
import { buildApp } from "../app.js";
import { registerStudio } from "./routes.js";
import { StudioService } from "./service.js";
const origin = "http://localhost:3000";
test("studio enforces authorization, versioning, canonical manifests and revoked installation access", async () => {
  assert.ok(process.env.DATABASE_URL);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const owner = randomUUID(),
    outsider = randomUUID(),
    member = randomUUID(),
    repo = randomUUID();
  const installation = Math.floor(Math.random() * 1000000000) + 1;
  let workspace = "";
  const app = buildApp();
  const service = new StudioService(pool, {
    resolveSelection: async () => ({
      commitSha: "a".repeat(40),
      generation: 1,
    }),
  });
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
  registerStudio(
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
  const request = (
    action: string,
    actor: string,
    body: Record<string, unknown> = {},
    method: "GET" | "POST" = "POST",
    csrf = true,
  ) =>
    app.inject({
      method,
      url: `/api/v1/studio/${action}?workspaceId=${workspace}`,
      headers: {
        ...(actor ? { "x-test-user": actor } : {}),
        ...(csrf ? { origin, "x-codaryn-request": "workspace" } : {}),
      },
      ...(method === "POST"
        ? { payload: { workspaceId: workspace, ...body } }
        : {}),
    });
  try {
    await pool.query("INSERT INTO app_users (id) VALUES ($1),($2),($3)", [
      owner,
      outsider,
      member,
    ]);
    workspace = (
      await new WorkspaceService(pool).create(owner, "Studio acceptance")
    ).id;
    await pool.query(
      "INSERT INTO organization_members (organization_id,user_id,role) VALUES ($1,$2,'member')",
      [workspace, member],
    );
    await pool.query(
      "INSERT INTO github_installations (id,organization_id) VALUES ($1,$2)",
      [installation, workspace],
    );
    await pool.query(
      "INSERT INTO connected_repositories (id,installation_id,github_id,full_name,private,default_branch) VALUES ($1,$2,1,'owner/repo',true,'main')",
      [repo, installation],
    );
    assert.equal((await request("profiles", "", {}, "GET")).statusCode, 401);
    assert.equal(
      (await request("profiles", outsider, {}, "GET")).statusCode,
      404,
    );
    assert.equal(
      (
        await request(
          "save",
          owner,
          { name: "Preset", configuration: studioDefaults },
          "POST",
          false,
        )
      ).statusCode,
      403,
    );
    assert.equal(
      (
        await request("save", member, {
          name: "Preset",
          configuration: studioDefaults,
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (
        await request("validate", owner, {
          configuration: { ...studioDefaults, analyzers: ["unknown"] },
        })
      ).statusCode,
      400,
    );
    const saved = await request("save", owner, {
      name: "Preset",
      configuration: { ...studioDefaults, analyzers: ["react"] },
    });
    assert.equal(saved.statusCode, 200);
    const profile: {
      id: string;
      revision: number;
      configuration: { analyzers: string[] };
    } = saved.json();
    assert.ok(profile.configuration.analyzers.includes("typescript"));
    const updated = await request("save", owner, {
      id: profile.id,
      revision: 1,
      name: "Renamed",
      configuration: studioDefaults,
    });
    assert.equal(updated.statusCode, 200);
    assert.equal(updated.json().revision, 2);
    assert.equal(
      (
        await request("save", owner, {
          id: profile.id,
          revision: 1,
          name: "Stale",
          configuration: studioDefaults,
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT revision FROM analysis_profile_versions WHERE profile_id=$1",
          [profile.id],
        )
      ).rowCount,
      2,
    );
    assert.equal(
      (
        await request("save", outsider, {
          id: profile.id,
          revision: 2,
          name: "Stolen",
          configuration: studioDefaults,
        })
      ).statusCode,
      404,
    );
    const duplicate = await request("save", owner, {
      name: "Copy",
      configuration: profile.configuration,
    });
    assert.equal(duplicate.statusCode, 200);
    assert.notEqual(duplicate.json().id, profile.id);
    const first = await request("start", member, {
      repositoryId: repo,
      ref: "a".repeat(40),
      configuration: { ...studioDefaults, analyzers: ["react", "api"] },
    });
    assert.equal(first.statusCode, 201);
    const manifest = studioManifestResponseSchema.parse(first.json());
    const second = await request("start", owner, {
      repositoryId: repo,
      ref: "a".repeat(40),
      configuration: { ...studioDefaults, analyzers: ["api", "react"] },
    });
    assert.equal(manifest.hash, second.json().hash);
    assert.equal(
      (await request("manifests", outsider, {}, "GET")).statusCode,
      404,
    );
    assert.equal(
      (await request("delete", member, { id: profile.id, revision: 2 }))
        .statusCode,
      404,
    );
    const concurrent = await Promise.all([
      request("save", owner, {
        id: profile.id,
        revision: 2,
        name: "Concurrent A",
        configuration: studioDefaults,
      }),
      request("save", owner, {
        id: profile.id,
        revision: 2,
        name: "Concurrent B",
        configuration: studioDefaults,
      }),
    ]);
    assert.deepEqual(
      concurrent.map((item) => item.statusCode).sort(),
      [200, 409],
    );
    assert.equal(
      (await request("delete", owner, { id: profile.id, revision: 3 }))
        .statusCode,
      200,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM analysis_profile_versions WHERE profile_id=$1",
          [profile.id],
        )
      ).rowCount,
      0,
    );
    await pool.query(
      "UPDATE github_installations SET connected=false,generation=2 WHERE id=$1",
      [installation],
    );
    assert.equal(
      (
        await request("start", owner, {
          repositoryId: repo,
          ref: "a".repeat(40),
          configuration: studioDefaults,
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (
        await pool.query(
          "SELECT id FROM analysis_manifests WHERE organization_id=$1",
          [workspace],
        )
      ).rowCount,
      2,
    );
  } finally {
    await app.close();
    if (workspace) {
      await pool.query(
        "DELETE FROM analysis_manifests WHERE organization_id=$1",
        [workspace],
      );
      await pool.query(
        "DELETE FROM analysis_profiles WHERE organization_id=$1",
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
      await pool.query(
        "DELETE FROM workspace_preferences WHERE organization_id=$1",
        [workspace],
      );
      await pool.query("DELETE FROM organizations WHERE id=$1", [workspace]);
    }
    await pool.query("DELETE FROM app_users WHERE id=ANY($1::text[])", [
      [owner, outsider, member],
    ]);
    await pool.end();
  }
});
