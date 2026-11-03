import { randomUUID } from "node:crypto";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { Pool } from "pg";
import { WorkspaceAccessError, WorkspaceService } from "./workspaces.js";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile();
  } catch {}
  try {
    process.loadEnvFile(new URL("../../../.env", import.meta.url));
  } catch {}
}

const connectionString = process.env.DATABASE_URL;

test("workspaces enforce membership and audit changes atomically", async () => {
  assert.ok(connectionString, "DATABASE_URL is required");
  const pool = new Pool({ connectionString });
  const owner = randomUUID();
  const other = randomUUID();
  const member = randomUUID();
  const admin = randomUUID();
  let workspaceId: string | undefined;
  try {
    await pool.query(
      "INSERT INTO app_users (id) VALUES ($1), ($2), ($3), ($4)",
      [owner, other, member, admin],
    );
    const service = new WorkspaceService(pool);
    const created = await service.create(owner, "  Example  ");
    workspaceId = created.id;
    assert.equal(created.name, "Example");
    assert.equal((await service.list(owner)).length, 1);
    assert.deepEqual(await service.list(other), []);
    await assert.rejects(
      service.rename(other, created.id, "Intrusion"),
      WorkspaceAccessError,
    );
    await pool.query(
      "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'member'), ($1, $3, 'admin')",
      [created.id, member, admin],
    );
    await assert.rejects(
      service.rename(member, created.id, "Not allowed"),
      WorkspaceAccessError,
    );
    await service.rename(admin, created.id, "Updated");
    assert.equal((await service.list(owner))[0].name, "Updated");
    const events = await pool.query<{ action: string }>(
      "SELECT action FROM audit_events WHERE organization_id = $1 ORDER BY created_at, action",
      [created.id],
    );
    assert.deepEqual(
      events.rows.map((row) => row.action),
      ["workspace.created", "workspace.renamed"],
    );
    await assert.rejects(service.create(owner, "   "));
  } finally {
    if (workspaceId) {
      await pool.query("DELETE FROM audit_events WHERE organization_id = $1", [
        workspaceId,
      ]);
      await pool.query("DELETE FROM organizations WHERE id = $1", [
        workspaceId,
      ]);
    }
    await pool.query("DELETE FROM app_users WHERE id IN ($1, $2, $3, $4)", [
      owner,
      other,
      member,
      admin,
    ]);
    await pool.end();
  }
});
