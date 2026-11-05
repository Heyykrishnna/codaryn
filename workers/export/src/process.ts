import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type {
  DiagramLayoutConfig,
  ExportFormat,
  ExportRequest,
  ExportType,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";
import { exportArtifact } from "@codaryn/export-engine";

interface ClaimedExportJobRow {
  id: string;
  organization_id: string;
  repository_id: string;
  job_id: string;
  actor_id: string;
  export_type: ExportType;
  format: ExportFormat;
  target_id: string;
  attempts: number;
}

interface TenantAccessRow {
  organization_id: string;
  repository_full_name: string;
  commit_sha: string;
}

export async function loadSnapshotForExport(
  client: PoolClient,
  jobId: string,
  organizationId: string,
): Promise<AnalysisSnapshotInput> {
  const jobResult = await client.query<{
    id: string;
    commit_sha: string;
    full_name: string;
  }>(
    "SELECT j.id,j.commit_sha,r.full_name FROM analysis_jobs j JOIN connected_repositories r ON r.id=j.repository_id WHERE j.id=$1 AND j.organization_id=$2",
    [jobId, organizationId],
  );

  const job = jobResult.rows[0];
  if (!job) {
    throw new Error("ANALYSIS_JOB_NOT_FOUND");
  }

  const snapshot: AnalysisSnapshotInput = {
    jobId: job.id,
    commitSha: job.commit_sha,
    repositoryName: job.full_name,
  };

  const schemaResult = await client.query<{ snapshot: unknown }>(
    "SELECT snapshot FROM analysis_schema_snapshots WHERE job_id=$1 AND organization_id=$2 AND status='completed' ORDER BY created_at DESC LIMIT 1",
    [jobId, organizationId],
  );
  if (schemaResult.rows[0]?.snapshot) {
    const raw = schemaResult.rows[0].snapshot as {
      tables?: unknown[];
      relations?: unknown[];
    };
    snapshot.schema = {
      tables: (raw.tables as never) ?? [],
      relations: (raw.relations as never) ?? [],
    };
  }

  const execResult = await client.query<{ snapshot: unknown }>(
    "SELECT snapshot FROM analysis_execution_snapshots WHERE job_id=$1 AND organization_id=$2 AND status='completed' ORDER BY created_at DESC LIMIT 1",
    [jobId, organizationId],
  );
  if (execResult.rows[0]?.snapshot) {
    const raw = execResult.rows[0].snapshot as {
      functions?: unknown[];
      calls?: unknown[];
    };
    snapshot.execution = {
      functions: (raw.functions as never) ?? [],
      calls: (raw.calls as never) ?? [],
    };
  }

  const feComponents = await client.query<{
    id: string;
    name: string;
    file_path: string;
    start_line: number;
    end_line: number;
    is_page: boolean;
  }>(
    "SELECT id,name,file_path,start_line,end_line,is_page FROM analysis_frontend_components WHERE job_id=$1",
    [jobId],
  );
  if (feComponents.rowCount && feComponents.rowCount > 0) {
    snapshot.frontend = {
      components: feComponents.rows.map((r) => ({
        id: r.id,
        name: r.name,
        filePath: r.file_path,
        startLine: r.start_line,
        endLine: r.end_line,
        isPage: r.is_page,
      })),
      routes: [],
      contexts: [],
      hooks: [],
      apiClients: [],
      connections: [],
    };
  }

  const beRoutes = await client.query<{
    id: string;
    method: string;
    path: string;
    file_path: string;
    start_line: number;
    end_line: number;
  }>(
    "SELECT id,method,path,file_path,start_line,end_line FROM analysis_backend_routes WHERE job_id=$1",
    [jobId],
  );
  if (beRoutes.rowCount && beRoutes.rowCount > 0) {
    snapshot.backend = {
      routes: beRoutes.rows.map((r) => ({
        id: r.id,
        method: r.method,
        path: r.path,
        filePath: r.file_path,
        startLine: r.start_line,
        endLine: r.end_line,
      })),
      controllers: [],
      services: [],
      repositories: [],
      middleware: [],
      connections: [],
    };
  }

  const depNodes = await client.query<{
    id: string;
    path: string;
    name: string;
  }>("SELECT id,path,name FROM analysis_graph_nodes WHERE job_id=$1", [jobId]);
  if (depNodes.rowCount && depNodes.rowCount > 0) {
    snapshot.dependencies = {
      nodes: depNodes.rows.map((r) => ({
        id: r.id,
        path: r.path,
        name: r.name,
      })),
      edges: [],
    };
  }

  return snapshot;
}

export async function runOneExportJob(pool: Pool): Promise<boolean> {
  await pool.query(
    "UPDATE export_jobs SET status=CASE WHEN attempts>=3 THEN 'failed' ELSE 'queued' END,error_message='LEASE_EXPIRED',lease_id=NULL,lease_at=NULL WHERE status='running' AND lease_at<now()-interval '5 minutes'",
  );

  const lease = randomUUID();
  const claimResult = await pool.query<ClaimedExportJobRow>(
    "WITH candidate AS (SELECT id FROM export_jobs WHERE status='queued' AND attempts<3 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE export_jobs j SET status='running',attempts=attempts+1,lease_id=$1,lease_at=now(),error_message=NULL FROM candidate WHERE j.id=candidate.id RETURNING j.id,j.organization_id,j.repository_id,j.job_id,j.actor_id,j.export_type,j.format,j.target_id,j.attempts",
    [lease],
  );

  const job = claimResult.rows[0];
  if (!job) return false;

  const client = await pool.connect();
  try {
    const authCheck = await client.query<TenantAccessRow>(
      "SELECT o.id AS organization_id,r.full_name AS repository_full_name,j.commit_sha FROM export_jobs ej JOIN organizations o ON o.id=ej.organization_id JOIN organization_members m ON m.organization_id=ej.organization_id AND m.user_id=ej.actor_id JOIN connected_repositories r ON r.id=ej.repository_id AND r.organization_id=ej.organization_id JOIN analysis_jobs j ON j.id=ej.job_id AND j.organization_id=ej.organization_id WHERE ej.id=$1 AND ej.lease_id=$2 AND o.deleted_at IS NULL AND r.active=true AND j.status<>'cancelled'",
      [job.id, lease],
    );

    if (!authCheck.rows[0]) {
      await client.query(
        "UPDATE export_jobs SET status='failed',error_message='UNAUTHORIZED',completed_at=now() WHERE id=$1",
        [job.id],
      );
      return true;
    }

    const snapshot = await loadSnapshotForExport(
      client,
      job.job_id,
      job.organization_id,
    );

    const exportReq: ExportRequest = {
      jobId: job.job_id,
      exportType: job.export_type,
      format: job.format,
      targetId: job.target_id,
    };

    let layoutConfig: DiagramLayoutConfig | undefined;
    const layoutRes = await client.query<{
      layout_config: DiagramLayoutConfig;
    }>(
      "SELECT layout_config FROM saved_diagram_layouts WHERE job_id=$1 AND organization_id=$2 AND diagram_type=$3 ORDER BY updated_at DESC LIMIT 1",
      [job.job_id, job.organization_id, job.target_id],
    );
    if (layoutRes.rows[0]?.layout_config) {
      layoutConfig = layoutRes.rows[0].layout_config;
    }

    const artifactResult = exportArtifact(exportReq, snapshot, layoutConfig);

    await client.query("BEGIN");

    const artifactId = randomUUID();
    await client.query(
      "INSERT INTO export_artifacts (id,export_job_id,organization_id,content_type,filename,payload,size,hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        artifactId,
        job.id,
        job.organization_id,
        artifactResult.contentType,
        artifactResult.filename,
        artifactResult.content,
        artifactResult.size,
        artifactResult.hash,
      ],
    );

    await client.query(
      "UPDATE export_jobs SET status='completed',artifact_size=$1,artifact_hash=$2,completed_at=now() WHERE id=$3",
      [artifactResult.size, artifactResult.hash, job.id],
    );

    await client.query("COMMIT");
    return true;
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "EXPORT_FAILED";
    await pool.query(
      "UPDATE export_jobs SET status='failed',error_message=$1,completed_at=now() WHERE id=$2",
      [message.slice(0, 512), job.id],
    );
    return true;
  } finally {
    client.release();
  }
}
