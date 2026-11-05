import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  type ExportFormat,
  type ExportJobResponse,
  type ExportRequest,
  type ExportType,
  exportJobResponseSchema,
  exportRequestSchema,
} from "@codaryn/contracts";
import { WorkspaceAccessError } from "@codaryn/database";
import { RequestFailure } from "../http/access.js";

interface ExportJobRow {
  id: string;
  job_id: string;
  export_type: ExportType;
  format: ExportFormat;
  target_id: string;
  status: "queued" | "running" | "completed" | "failed";
  artifact_size: number | null;
  artifact_hash: string | null;
  error_message: string | null;
  created_at: Date;
  completed_at: Date | null;
}

interface ExportArtifactRow {
  id: string;
  content_type: string;
  filename: string;
  payload: string;
  size: number;
  hash: string;
}

export class ExportService {
  constructor(private readonly pool: Pool) {}

  private async workspace<T>(
    actor: string,
    workspaceId: string,
    operation: (client: PoolClient) => Promise<T>,
    write = false,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (write) {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [`exports:${workspaceId}`],
        );
      }
      const membership = await client.query(
        "SELECT m.role FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND o.id=$2 AND o.deleted_at IS NULL FOR SHARE OF m,o",
        [actor, workspaceId],
      );
      if (!membership.rowCount) {
        throw new WorkspaceAccessError();
      }
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

  async scheduleExport(
    actor: string,
    workspaceId: string,
    jobId: string,
    rawRequest: unknown,
  ): Promise<ExportJobResponse> {
    const input = exportRequestSchema.parse(rawRequest);

    return this.workspace(
      actor,
      workspaceId,
      async (client) => {
        const repoRes = await client.query<{ repository_id: string }>(
          "SELECT repository_id FROM analysis_jobs WHERE id=$1 AND organization_id=$2 AND status<>'cancelled'",
          [jobId, workspaceId],
        );
        const repo = repoRes.rows[0];
        if (!repo) {
          throw new RequestFailure(
            404,
            "JOB_NOT_FOUND",
            "Analysis job not found in workspace",
          );
        }

        const recent = await client.query<{ count: string }>(
          "SELECT count(*) FROM export_jobs WHERE organization_id=$1 AND created_at>now()-interval '1 minute'",
          [workspaceId],
        );
        if (Number(recent.rows[0]?.count ?? 0) >= 10) {
          throw new RequestFailure(
            429,
            "EXPORT_RATE_LIMIT",
            "Too many export jobs queued, please wait",
          );
        }

        const id = randomUUID();
        const now = new Date().toISOString();

        await client.query(
          "INSERT INTO export_jobs (id,organization_id,repository_id,job_id,actor_id,export_type,format,target_id,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'queued',$9)",
          [
            id,
            workspaceId,
            repo.repository_id,
            jobId,
            actor,
            input.exportType,
            input.format,
            input.targetId,
            now,
          ],
        );

        return exportJobResponseSchema.parse({
          id,
          jobId,
          exportType: input.exportType,
          format: input.format,
          targetId: input.targetId,
          status: "queued",
          createdAt: now,
        });
      },
      true,
    );
  }

  async getExportStatus(
    actor: string,
    workspaceId: string,
    jobId: string,
    exportId: string,
  ): Promise<ExportJobResponse> {
    return this.workspace(actor, workspaceId, async (client) => {
      const result = await client.query<ExportJobRow>(
        "SELECT id,job_id,export_type,format,target_id,status,artifact_size,artifact_hash,error_message,created_at,completed_at FROM export_jobs WHERE id=$1 AND organization_id=$2 AND job_id=$3",
        [exportId, workspaceId, jobId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new RequestFailure(
          404,
          "EXPORT_NOT_FOUND",
          "Export job not found in workspace",
        );
      }

      return exportJobResponseSchema.parse({
        id: row.id,
        jobId: row.job_id,
        exportType: row.export_type,
        format: row.format,
        targetId: row.target_id,
        status: row.status,
        artifactSize: row.artifact_size ?? undefined,
        artifactHash: row.artifact_hash ?? undefined,
        errorMessage: row.error_message ?? undefined,
        createdAt: row.created_at.toISOString(),
        completedAt: row.completed_at?.toISOString(),
      });
    });
  }

  async getArtifactPayload(
    actor: string,
    workspaceId: string,
    jobId: string,
    exportId: string,
  ): Promise<ExportArtifactRow> {
    return this.workspace(actor, workspaceId, async (client) => {
      const jobResult = await client.query<ExportJobRow>(
        "SELECT id,status,error_message FROM export_jobs WHERE id=$1 AND organization_id=$2 AND job_id=$3",
        [exportId, workspaceId, jobId],
      );

      const job = jobResult.rows[0];
      if (!job) {
        throw new RequestFailure(
          404,
          "EXPORT_NOT_FOUND",
          "Export job not found",
        );
      }
      if (job.status === "failed") {
        throw new RequestFailure(
          409,
          "EXPORT_FAILED",
          job.error_message || "Export processing failed",
        );
      }
      if (job.status !== "completed") {
        throw new RequestFailure(
          409,
          "EXPORT_PENDING",
          "Export job is still in progress",
        );
      }

      const artifactResult = await client.query<ExportArtifactRow>(
        "SELECT id,content_type,filename,payload,size,hash FROM export_artifacts WHERE export_job_id=$1 AND organization_id=$2",
        [exportId, workspaceId],
      );

      const artifact = artifactResult.rows[0];
      if (!artifact) {
        throw new RequestFailure(
          404,
          "ARTIFACT_NOT_FOUND",
          "Export artifact record missing",
        );
      }

      return artifact;
    });
  }
}
