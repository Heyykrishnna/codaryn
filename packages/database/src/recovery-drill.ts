import { strict as assert } from "node:assert";
import { randomUUID, createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
const sourceURL = new URL(process.env.DATABASE_URL ?? ""),
  container = process.env.RECOVERY_CONTAINER ?? "";
assert.equal(
  sourceURL.hostname,
  "127.0.0.1",
  "Recovery drills require a disposable loopback database",
);
assert.equal(sourceURL.port, "55495");
assert.equal(sourceURL.pathname, "/codaryn");
assert.match(container, /^codaryn-phase14-postgres-1$/);
const target = `restore_${randomUUID().replaceAll("-", "")}`,
  pool = new Pool({ connectionString: sourceURL.toString() }),
  actor = randomUUID(),
  workspace = randomUUID(),
  event = randomUUID(),
  payload = "release-backup-integrity-fixture",
  hash = createHash("sha256").update(payload).digest("hex");
let restored: Pool | null = null,
  created = false;
function command(args: string[], input?: Buffer) {
  const result = spawnSync(
    "docker",
    ["exec", ...(input ? ["-i"] : []), container, ...args],
    { input, maxBuffer: 64 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(
      "Backup tool failed; inspect the isolated container without publishing credentials",
    );
  return result.stdout;
}
try {
  await pool.query("INSERT INTO app_users(id) VALUES($1)", [actor]);
  await pool.query("INSERT INTO organizations(id,name) VALUES($1,$2)", [
    workspace,
    payload,
  ]);
  await pool.query(
    "INSERT INTO audit_events(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'release.restore.fixture',$4)",
    [event, workspace, actor, hash],
  );
  const expected = await pool.query<{ name: string; checksum: string }>(
    "SELECT name,checksum FROM schema_migrations ORDER BY name",
  );
  const backup = command([
    "pg_dump",
    "--username=codaryn",
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "codaryn",
  ]);
  assert.ok(backup.length > 0);
  await pool.query(`CREATE DATABASE ${target}`);
  created = true;
  command(
    [
      "pg_restore",
      "--username=codaryn",
      "--dbname=" + target,
      "--no-owner",
      "--no-acl",
      "--exit-on-error",
    ],
    backup,
  );
  const restoredURL = new URL(sourceURL);
  restoredURL.pathname = "/" + target;
  restored = new Pool({ connectionString: restoredURL.toString() });
  const actual = await restored.query(
    "SELECT name,checksum FROM schema_migrations ORDER BY name",
  );
  assert.deepEqual(actual.rows, expected.rows);
  const sample = await restored.query<{ name: string; target_id: string }>(
    "SELECT o.name,a.target_id FROM organizations o JOIN audit_events a ON a.organization_id=o.id WHERE o.id=$1 AND a.id=$2",
    [workspace, event],
  );
  assert.equal(sample.rows[0].name, payload);
  assert.equal(
    sample.rows[0].target_id,
    createHash("sha256").update(sample.rows[0].name).digest("hex"),
  );
  const tables = await restored.query<{ count: string }>(
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'",
  );
  for (const table of ['"user"', '"session"', '"account"', '"verification"'])
    await restored.query(`SELECT count(*) FROM ${table}`);
  console.log(
    JSON.stringify({
      drill: "backup-restoration",
      status: "passed",
      migrations: actual.rowCount,
      publicTables: Number(tables.rows[0].count),
      archiveBytes: backup.length,
      archiveSha256: createHash("sha256").update(backup).digest("hex"),
      sampleHash: hash,
      environment: "disposable-postgresql-17",
    }),
  );
} finally {
  await restored?.end();
  if (created) await pool.query(`DROP DATABASE ${target}`);
  await pool.query("DELETE FROM audit_events WHERE id=$1", [event]);
  await pool.query("DELETE FROM organizations WHERE id=$1", [workspace]);
  await pool.query("DELETE FROM app_users WHERE id=$1", [actor]);
  await pool.end();
}
