import type { Pool } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { withRepositoryArchive } from "@codaryn/repository-ingestion";

interface Run {
  id: string;
  commit_sha: string;
  full_name: string;
  installation_id: string;
}
const accessible = `SELECT j.id,j.commit_sha,r.full_name,r.installation_id FROM ingestion_runs j JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id JOIN organization_members m ON m.organization_id=i.organization_id AND m.user_id=j.actor_id JOIN organizations o ON o.id=i.organization_id WHERE j.id=$1 AND j.installation_generation=i.generation AND i.connected=true AND r.active=true AND o.deleted_at IS NULL`;
export async function processIngestion(
  pool: Pool,
  github: GitHubGateway,
  id: string,
) {
  const status = await pool.query<{ status: string }>(
    "SELECT status FROM ingestion_runs WHERE id=$1",
    [id],
  );
  if (!status.rows[0] || status.rows[0].status === "completed") return;
  try {
    const run = (await pool.query<Run>(accessible, [id])).rows[0];
    if (!run) throw new Error("ACCESS_REVOKED");
    await pool.query(
      "UPDATE ingestion_runs SET status='running',error_code=NULL WHERE id=$1",
      [id],
    );
    const archive = await github.archive(
      Number(run.installation_id),
      run.full_name,
      run.commit_sha,
    );
    await withRepositoryArchive(archive, {}, async (_directory, inventory) => {
      const confirmed = await github.resolve(
        Number(run.installation_id),
        run.full_name,
        run.commit_sha,
      );
      if (confirmed !== run.commit_sha) throw new Error("COMMIT_MISMATCH");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(
          "SELECT i.id FROM github_installations i JOIN connected_repositories r ON r.installation_id=i.id JOIN ingestion_runs j ON j.repository_id=r.id WHERE j.id=$1 FOR SHARE OF i,r",
          [id],
        );
        const current = await client.query<Run>(accessible, [id]);
        if (!current.rowCount) throw new Error("ACCESS_REVOKED");
        await client.query(
          "UPDATE ingestion_runs SET status='completed',inventory=$2,completed_at=now(),error_code=NULL WHERE id=$1 AND status<>'completed'",
          [id, JSON.stringify(inventory)],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    });
  } catch (error) {
    const code =
      error instanceof Error &&
      ["ACCESS_REVOKED", "COMMIT_MISMATCH"].includes(error.message)
        ? error.message
        : "INGESTION_FAILED";
    await pool.query(
      "UPDATE ingestion_runs SET status='failed',error_code=$2,inventory=NULL WHERE id=$1 AND status<>'completed'",
      [id, code],
    );
    throw new Error(code);
  }
}
