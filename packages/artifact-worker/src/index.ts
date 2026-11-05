import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Pool } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { withRepositoryArchive } from "@codaryn/repository-ingestion";
export interface ArtifactExtractor {
  kind: "schema" | "execution" | "quality";
  accept?: (path: string) => boolean;
  extract(
    files: Record<string, string>,
    infer: boolean,
  ):
    | { snapshot: unknown; hash: string; count: number }
    | Promise<{ snapshot: unknown; hash: string; count: number }>;
}
const tables = {
  schema: "analysis_schema_snapshots",
  execution: "analysis_execution_snapshots",
  quality: "analysis_quality_snapshots",
} as const;
const counts = {
  schema: "table_count",
  execution: "function_count",
  quality: "finding_count",
} as const;
async function* sourceBatches(directory: string, paths: string[]) {
  for (let offset = 0; offset < paths.length; offset += 8)
    yield Promise.allSettled(
      paths.slice(offset, offset + 8).map(async (path) => ({
        path,
        source: await readFile(join(directory, path), "utf8"),
      })),
    );
}
interface RequestRow {
  id: string;
  commit_sha: string;
  full_name: string;
  installation_id: string;
  infer_relations?: boolean;
}
function accessQuery(table: string) {
  const option =
    table === tables.schema
      ? "s.infer_relations,"
      : table === tables.quality
        ? "s.external_scans AS infer_relations,"
        : "";
  const policy =
    table === tables.quality
      ? " AND (s.external_scans=false OR m.role IN ('owner','admin'))"
      : "";
  return `SELECT s.id,s.commit_sha,${option}r.full_name,r.installation_id FROM ${table} s JOIN analysis_jobs j ON j.id=s.job_id AND j.repository_id=s.repository_id AND j.organization_id=s.organization_id AND j.commit_sha=s.commit_sha JOIN connected_repositories r ON r.id=s.repository_id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=s.organization_id JOIN organization_members m ON m.organization_id=s.organization_id AND m.user_id=s.actor_id JOIN organizations o ON o.id=s.organization_id WHERE s.id=$1 AND s.lease_id=$2 AND s.status='running' AND i.generation=s.installation_generation AND i.connected=true AND r.active=true AND o.deleted_at IS NULL AND j.status<>'cancelled'${policy}`;
}
export async function runOneArtifactRequest(
  pool: Pool,
  github: GitHubGateway,
  extractor: ArtifactExtractor,
): Promise<boolean> {
  const table = tables[extractor.kind],
    count = counts[extractor.kind],
    accessible = accessQuery(table),
    prefix = { schema: "SCHEMA", execution: "EXECUTION", quality: "QUALITY" }[
      extractor.kind
    ],
    limitCode = `${prefix}_LIMIT`,
    failureCode = `${prefix}_EXTRACTION_FAILED`;
  await pool.query(
    `UPDATE ${table} SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,failure_code='LEASE_EXPIRED',lease_id=NULL,lease_at=NULL WHERE status='running' AND lease_at<now()-interval '5 minutes'`,
  );
  const lease = randomUUID();
  const claimed = await pool.query<{ id: string }>(
    `WITH candidate AS (SELECT id FROM ${table} WHERE status='queued' AND attempts<3 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE ${table} s SET status='running',attempts=attempts+1,lease_id=$1,lease_at=now(),failure_code=NULL FROM candidate WHERE s.id=candidate.id RETURNING s.id`,
    [lease],
  );
  const id = claimed.rows[0]?.id;
  if (!id) return false;
  try {
    const request = (await pool.query<RequestRow>(accessible, [id, lease]))
      .rows[0];
    if (!request) throw new Error("ACCESS_REVOKED");
    const archive = await github.archive(
      Number(request.installation_id),
      request.full_name,
      request.commit_sha,
    );
    await withRepositoryArchive(archive, {}, async (directory, inventory) => {
      const files: Record<string, string> = {};
      const candidates = inventory.files.filter((item) =>
        extractor.accept
          ? extractor.accept(item.path)
          : /\.(sql|prisma|[cm]?[jt]sx?)$/.test(item.path),
      );
      for await (const batch of sourceBatches(
        directory,
        candidates.map((item) => item.path),
      )) {
        for (const item of batch) {
          if (item.status === "rejected") throw new Error("SCHEMA_READ_FAILED");
          files[item.value.path] = item.value.source;
        }
      }
      if (!(await pool.query(accessible, [id, lease])).rowCount)
        throw new Error("ACCESS_REVOKED");
      const result = await extractor.extract(
        files,
        request.infer_relations ?? false,
      );
      if (Buffer.byteLength(JSON.stringify(result.snapshot)) > 20 * 1024 * 1024)
        throw new Error(limitCode);
      const resolved = await github.resolve(
        Number(request.installation_id),
        request.full_name,
        request.commit_sha,
      );
      if (resolved !== request.commit_sha) throw new Error("COMMIT_MISMATCH");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query<RequestRow>(
          accessible + " FOR SHARE OF i,r,m,o,j",
          [id, lease],
        );
        if (!current.rowCount) throw new Error("ACCESS_REVOKED");
        const updated = await client.query(
          `UPDATE ${table} SET status='completed',snapshot=$3,hash=$4,${count}=$5,completed_at=now(),lease_id=NULL,lease_at=NULL WHERE id=$1 AND lease_id=$2 AND status='running'`,
          [id, lease, result.snapshot, result.hash, result.count],
        );
        if (!updated.rowCount) throw new Error("LEASE_EXPIRED");
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
      [
        "ACCESS_REVOKED",
        "COMMIT_MISMATCH",
        limitCode,
        "LEASE_EXPIRED",
      ].includes(error.message)
        ? error.message
        : failureCode;
    await pool.query(
      `UPDATE ${table} SET status=CASE WHEN $3 IN ('ACCESS_REVOKED','COMMIT_MISMATCH') OR $3=$4 OR attempts>=3 THEN 'failed' ELSE 'queued' END,failure_code=$3,lease_id=NULL,lease_at=NULL WHERE id=$1 AND lease_id=$2 AND status='running'`,
      [id, lease, code, limitCode],
    );
  }
  return true;
}

export { startArtifactPolling } from "./polling.js";
