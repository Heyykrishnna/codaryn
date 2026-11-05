import type { Pool, PoolClient } from "pg";
import { WorkspaceAccessError } from "@codaryn/database";
export async function artifactWorkspace<T>(
  pool: Pool,
  kind: "schema" | "execution" | "quality",
  actor: string,
  workspace: string,
  operation: (client: PoolClient) => Promise<T>,
  write = false,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (write)
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [`${kind}:${workspace}`],
      );
    const membership = await client.query(
      "SELECT m.role FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND o.id=$2 AND o.deleted_at IS NULL FOR SHARE OF m,o",
      [actor, workspace],
    );
    if (!membership.rowCount) throw new WorkspaceAccessError();
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
