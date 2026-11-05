import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool, PoolClient } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { withRepositoryArchive } from "@codaryn/repository-ingestion";
import { AnalysisProcessor } from "./processor.js";
const accessible =
  "SELECT j.id,j.commit_sha,r.full_name,i.id AS installation_id,i.generation FROM analysis_jobs j JOIN organizations o ON o.id=j.organization_id JOIN organization_members m ON m.organization_id=o.id AND m.user_id=j.actor_id JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=o.id WHERE j.id=$1 AND j.lease_id=$2 AND j.status IN ('running','completed') AND o.deleted_at IS NULL AND r.active=true AND i.connected=true";
export async function runOneAnalysisJob(
  pool: Pool,
  github: Pick<GitHubGateway, "archive" | "resolve">,
) {
  await pool.query(
    "UPDATE analysis_jobs SET status=CASE WHEN retries>=max_retries THEN 'failed' ELSE 'queued' END,failure_reason='LEASE_EXPIRED',lease_id=NULL,lease_at=NULL WHERE status='running' AND (lease_at<now()-interval '5 minutes' OR (lease_at IS NULL AND updated_at<now()-interval '5 minutes'))",
  );
  const lease = randomUUID(),
    claimed = await pool.query<{ id: string }>(
      "WITH candidate AS (SELECT id FROM analysis_jobs WHERE status='queued' AND retries<max_retries ORDER BY created_at,id FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE analysis_jobs j SET status='running',retries=retries+1,lease_id=$1,lease_at=now(),failure_reason=NULL FROM candidate WHERE j.id=candidate.id RETURNING j.id",
      [lease],
    ),
    id = claimed.rows[0]?.id;
  if (!id) return false;
  try {
    const row = (
      await pool.query<{
        id: string;
        commit_sha: string;
        full_name: string;
        installation_id: string;
        generation: number;
      }>(accessible, [id, lease])
    ).rows[0];
    if (!row) throw new Error("ACCESS_REVOKED");
    const archive = await github.archive(
      Number(row.installation_id),
      row.full_name,
      row.commit_sha,
    );
    await withRepositoryArchive(archive, {}, async (directory, inventory) => {
      const candidates = inventory.files.filter((file) =>
        /\.(?:[cm]?[jt]sx?|json)$/.test(file.path),
      );
      if (
        candidates.length > 1000 ||
        candidates.reduce((sum, file) => sum + file.bytes, 0) > 16777216
      )
        throw new Error("ANALYSIS_LIMIT");
      const files: Record<string, string> = {};
      for (const file of candidates)
        files[file.path] = await readFile(join(directory, file.path), "utf8");
      if (
        (await github.resolve(
          Number(row.installation_id),
          row.full_name,
          row.commit_sha,
        )) !== row.commit_sha
      )
        throw new Error("COMMIT_MISMATCH");
      const authorize = async (client: PoolClient) => {
        const current = (
          await client.query<{ generation: number }>(
            accessible + " FOR SHARE OF o,m,r,i",
            [id, lease],
          )
        ).rows[0];
        if (!current || current.generation !== row.generation)
          throw new Error("ACCESS_REVOKED");
      };
      await new AnalysisProcessor(pool).processJob(
        { jobId: id, files },
        authorize,
      );
      await pool.query(
        "UPDATE analysis_jobs SET lease_id=NULL,lease_at=NULL WHERE id=$1 AND lease_id=$2 AND status='completed'",
        [id, lease],
      );
    });
  } catch (error) {
    const code =
      error instanceof Error &&
      ["ACCESS_REVOKED", "COMMIT_MISMATCH", "ANALYSIS_LIMIT"].includes(
        error.message,
      )
        ? error.message
        : "ANALYSIS_FAILED";
    await pool.query(
      "UPDATE analysis_jobs SET status=CASE WHEN $3<>'ANALYSIS_FAILED' OR retries>=max_retries THEN 'failed' ELSE 'queued' END,failure_reason=$3,lease_id=NULL,lease_at=NULL WHERE id=$1 AND lease_id=$2 AND status='running'",
      [id, lease, code],
    );
  }
  return true;
}
