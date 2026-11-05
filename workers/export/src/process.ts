import { createHash, randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { frozenExportSchema } from "@codaryn/contracts";
const accessible =
  "SELECT o.id AS organization_id,j.commit_sha,ej.artifact_binding FROM export_jobs ej JOIN organizations o ON o.id=ej.organization_id JOIN organization_members m ON m.organization_id=ej.organization_id AND m.user_id=ej.actor_id JOIN connected_repositories r ON r.id=ej.repository_id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=ej.organization_id JOIN analysis_jobs j ON j.id=ej.job_id AND j.repository_id=ej.repository_id AND j.organization_id=ej.organization_id LEFT JOIN workspace_controls c ON c.organization_id=o.id WHERE ej.id=$1 AND ej.lease_id=$2 AND ej.status='running' AND o.deleted_at IS NULL AND i.connected=true AND r.active=true AND j.status<>'cancelled' AND (m.role IN ('owner','admin') OR COALESCE(c.allow_member_exports,true))";
export async function runOneExportJob(pool: Pool): Promise<boolean> {
  await pool.query(
    "UPDATE export_jobs SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,error_message='LEASE_EXPIRED',lease_id=NULL,lease_at=NULL WHERE status='running' AND lease_at<now()-interval '5 minutes'",
  );
  const lease = randomUUID(),
    claimed = await pool.query<{
      id: string;
      job_id: string;
      organization_id: string;
    }>(
      "WITH candidate AS (SELECT id FROM export_jobs WHERE status='queued' AND attempts<3 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE export_jobs j SET status='running',attempts=attempts+1,lease_id=$1,lease_at=now(),error_message=NULL FROM candidate WHERE j.id=candidate.id RETURNING j.id,j.job_id,j.organization_id",
      [lease],
    ),
    job = claimed.rows[0];
  if (!job) return false;
  const client = await pool.connect();
  let transaction = false;
  try {
    const access = await client.query<{
      artifact_binding: unknown;
      commit_sha: string;
    }>(accessible, [job.id, lease]);
    if (!access.rows[0]) throw new Error("UNAUTHORIZED");
    if (!access.rows[0].artifact_binding)
      throw new Error("EXPORT_BINDING_REQUIRED");
    const frozen = frozenExportSchema.parse(access.rows[0].artifact_binding),
      artifact = frozen.artifact;
    if (
      frozen.jobId !== job.job_id ||
      frozen.commitSha !== access.rows[0].commit_sha ||
      artifact.hash !==
        createHash("sha256").update(artifact.content).digest("hex") ||
      artifact.size !== Buffer.byteLength(artifact.content)
    )
      throw new Error("EXPORT_BINDING_INVALID");
    await client.query("BEGIN");
    transaction = true;
    if (
      !(
        await client.query(accessible + " FOR SHARE OF o,m,r,i,j", [
          job.id,
          lease,
        ])
      ).rowCount
    )
      throw new Error("UNAUTHORIZED");
    await client.query(
      "INSERT INTO export_artifacts(id,export_job_id,organization_id,content_type,filename,payload,size,hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        randomUUID(),
        job.id,
        job.organization_id,
        artifact.contentType,
        artifact.filename,
        artifact.content,
        artifact.size,
        artifact.hash,
      ],
    );
    if (
      !(
        await client.query(
          "UPDATE export_jobs SET status='completed',artifact_size=$1,artifact_hash=$2,completed_at=now(),lease_id=NULL,lease_at=NULL WHERE id=$3 AND lease_id=$4 AND status='running'",
          [artifact.size, artifact.hash, job.id, lease],
        )
      ).rowCount
    )
      throw new Error("LEASE_EXPIRED");
    await client.query(
      "INSERT INTO audit_events(id,organization_id,actor_id,action,target_id) SELECT $1,organization_id,actor_id,'team.export.completed',id::text FROM export_jobs WHERE id=$2",
      [randomUUID(), job.id],
    );
    await client.query("COMMIT");
    transaction = false;
    return true;
  } catch (error) {
    if (transaction) await client.query("ROLLBACK");
    const code =
      error instanceof Error &&
      [
        "UNAUTHORIZED",
        "EXPORT_BINDING_REQUIRED",
        "EXPORT_BINDING_INVALID",
        "LEASE_EXPIRED",
      ].includes(error.message)
        ? error.message
        : "EXPORT_FAILED";
    await pool.query(
      "UPDATE export_jobs SET status='failed',error_message=$1,completed_at=now(),lease_id=NULL,lease_at=NULL WHERE id=$2 AND lease_id=$3",
      [code, job.id, lease],
    );
    return true;
  } finally {
    client.release();
  }
}
