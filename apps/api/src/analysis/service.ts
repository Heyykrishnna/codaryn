import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import {
  analysisJobSummarySchema,
  diagnosticsResponseSchema,
  fileInventoryResponseSchema,
  symbolInventoryResponseSchema,
  type AnalysisJobSummary,
  type DiagnosticsResponse,
  type FileInventoryResponse,
  type SymbolInventoryResponse,
} from "@codaryn/contracts";

export class AnalysisServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class AnalysisService {
  constructor(private readonly pool: Pool) {}

  private async requireQueueCapacity(client: PoolClient, workspace: string) {
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `analysis-queue:${workspace}`,
    ]);
    const count = await client.query<{ count: string }>(
      "SELECT count(*) FROM analysis_jobs WHERE organization_id=$1 AND status IN ('queued','running')",
      [workspace],
    );
    if (Number(count.rows[0].count) >= 20)
      throw new AnalysisServiceError(
        429,
        "QUEUE_FULL",
        "Wait for existing analyses to finish",
      );
  }
  private async authorize(
    client: PoolClient,
    actor: string,
    workspace: string,
  ): Promise<string> {
    const res = await client.query<{ role: string }>(
      "SELECT m.role FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.organization_id=$1 AND m.user_id=$2 AND o.deleted_at IS NULL",
      [workspace, actor],
    );
    const role = res.rows[0]?.role;
    if (!role) {
      throw new AnalysisServiceError(
        403,
        "FORBIDDEN",
        "Workspace access denied",
      );
    }
    return role;
  }

  async startJob(
    actor: string,
    workspace: string,
    manifestId: string,
    repositoryId: string,
    ref: string,
  ): Promise<AnalysisJobSummary> {
    const client = await this.pool.connect();
    try {
      await this.authorize(client, actor, workspace);

      const manifestRes = await client.query<{
        id: string;
        manifest: { commitSha: string };
      }>(
        "SELECT id, manifest FROM analysis_manifests WHERE id=$1 AND organization_id=$2 AND repository_id=$3",
        [manifestId, workspace, repositoryId],
      );
      const manifestRow = manifestRes.rows[0];
      if (!manifestRow) {
        throw new AnalysisServiceError(
          404,
          "NOT_FOUND",
          "Analysis manifest not found",
        );
      }

      const jobId = randomUUID();
      const parsedCommit = z
        .string()
        .regex(/^[a-f0-9]{40}$/)
        .safeParse(manifestRow.manifest.commitSha);
      if (!parsedCommit.success)
        throw new AnalysisServiceError(
          422,
          "INVALID_MANIFEST",
          "Analysis requires a pinned commit",
        );
      const commitSha = parsedCommit.data;

      await client.query("BEGIN");
      await this.requireQueueCapacity(client, workspace);
      await client.query(
        "INSERT INTO analysis_jobs (id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha,status,current_stage) VALUES ($1,$2,$3,$4,$5,$6,$7,'queued','inventory')",
        [jobId, workspace, repositoryId, manifestId, actor, ref, commitSha],
      );

      const stages = [
        "inventory",
        "configuration",
        "parsing",
        "symbols",
        "graph",
        "diagnostics",
      ];
      for (const stage of stages) {
        await client.query(
          "INSERT INTO analysis_stages (id,job_id,stage,status) VALUES ($1,$2,$3,'pending')",
          [randomUUID(), jobId, stage],
        );
      }

      await client.query(
        "INSERT INTO audit_events (id,organization_id,actor_id,action,target_id) VALUES ($1,$2,$3,'analysis.job.started',$4)",
        [randomUUID(), workspace, actor, jobId],
      );

      await client.query("COMMIT");

      return this.getJob(actor, workspace, jobId);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async getJob(
    actor: string,
    workspace: string,
    jobId: string,
  ): Promise<AnalysisJobSummary> {
    const client = await this.pool.connect();
    try {
      await this.authorize(client, actor, workspace);

      const jobRes = await client.query<{
        id: string;
        manifest_id: string;
        repository_id: string;
        status: string;
        current_stage: string;
        file_count: number;
        symbol_count: number;
        diagnostic_count: number;
        retries: number;
        created_at: Date;
        updated_at: Date;
        completed_at: Date | null;
        failure_reason: string | null;
      }>(
        "SELECT id, manifest_id, repository_id, status, current_stage, file_count, symbol_count, diagnostic_count, retries, created_at, updated_at, completed_at, failure_reason FROM analysis_jobs WHERE id=$1 AND organization_id=$2",
        [jobId, workspace],
      );

      const row = jobRes.rows[0];
      if (!row) {
        throw new AnalysisServiceError(
          404,
          "NOT_FOUND",
          "Analysis job not found",
        );
      }

      const stagesRes = await client.query<{
        stage: string;
        status: string;
        items_total: number;
        items_completed: number;
        duration_ms: number | null;
        message: string | null;
      }>(
        "SELECT stage, status, items_total, items_completed, duration_ms, message FROM analysis_stages WHERE job_id=$1 ORDER BY created_at ASC",
        [jobId],
      );

      return analysisJobSummarySchema.parse({
        id: row.id,
        manifestId: row.manifest_id,
        repositoryId: row.repository_id,
        status: row.status,
        currentStage: row.current_stage,
        stages: stagesRes.rows.map((s) => ({
          stage: s.stage,
          status: s.status,
          itemsTotal: s.items_total,
          itemsCompleted: s.items_completed,
          durationMs: s.duration_ms ?? undefined,
          message: s.message ?? undefined,
        })),
        fileCount: row.file_count,
        symbolCount: row.symbol_count,
        diagnosticCount: row.diagnostic_count,
        retries: row.retries,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        completedAt: row.completed_at ? row.completed_at.toISOString() : null,
        failureReason: row.failure_reason,
      });
    } finally {
      client.release();
    }
  }

  async cancelJob(
    actor: string,
    workspace: string,
    jobId: string,
  ): Promise<AnalysisJobSummary> {
    const client = await this.pool.connect();
    try {
      await this.authorize(client, actor, workspace);

      await client.query("BEGIN");

      const updateRes = await client.query(
        "UPDATE analysis_jobs SET status='cancelled', updated_at=now() WHERE id=$1 AND organization_id=$2 AND status IN ('queued', 'running')",
        [jobId, workspace],
      );

      if (updateRes.rowCount === 0) {
        throw new AnalysisServiceError(
          409,
          "CONFLICT",
          "Job cannot be cancelled in its current state",
        );
      }

      await client.query(
        "UPDATE analysis_stages SET status='skipped', updated_at=now() WHERE job_id=$1 AND status IN ('pending', 'running')",
        [jobId],
      );

      await client.query(
        "INSERT INTO audit_events (id,organization_id,actor_id,action,target_id) VALUES ($1,$2,$3,'analysis.job.cancelled',$4)",
        [randomUUID(), workspace, actor, jobId],
      );

      await client.query("COMMIT");

      return this.getJob(actor, workspace, jobId);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async retryJob(
    actor: string,
    workspace: string,
    jobId: string,
  ): Promise<AnalysisJobSummary> {
    const client = await this.pool.connect();
    try {
      await this.authorize(client, actor, workspace);

      await client.query("BEGIN");
      await this.requireQueueCapacity(client, workspace);
      const updateRes = await client.query(
        "UPDATE analysis_jobs SET status='queued', current_stage='inventory', failure_reason=null, lease_id=NULL, lease_at=NULL, updated_at=now() WHERE id=$1 AND organization_id=$2 AND status='failed' AND retries < max_retries",
        [jobId, workspace],
      );

      if (updateRes.rowCount === 0) {
        throw new AnalysisServiceError(
          409,
          "CONFLICT",
          "Job cannot be retried or maximum retry limit exceeded",
        );
      }

      await client.query(
        "UPDATE analysis_stages SET status='pending', updated_at=now() WHERE job_id=$1",
        [jobId],
      );

      await client.query(
        "INSERT INTO audit_events (id,organization_id,actor_id,action,target_id) VALUES ($1,$2,$3,'analysis.job.retried',$4)",
        [randomUUID(), workspace, actor, jobId],
      );

      await client.query("COMMIT");

      return this.getJob(actor, workspace, jobId);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async getFileInventory(
    actor: string,
    workspace: string,
    jobId: string,
  ): Promise<FileInventoryResponse> {
    const client = await this.pool.connect();
    try {
      await this.authorize(client, actor, workspace);

      const filesRes = await client.query<{
        path: string;
        extension: string;
        language: string;
        role: string;
        size_bytes: number;
        lines_of_code: number;
        frameworks: string[];
      }>(
        "SELECT path, extension, language, role, size_bytes, lines_of_code, frameworks FROM analysis_files WHERE job_id=$1 ORDER BY path ASC",
        [jobId],
      );

      const byLanguage: Record<string, number> = {};
      const byRole: Record<string, number> = {};
      let totalLines = 0;

      const files = filesRes.rows.map((row) => {
        byLanguage[row.language] = (byLanguage[row.language] ?? 0) + 1;
        byRole[row.role] = (byRole[row.role] ?? 0) + 1;
        totalLines += row.lines_of_code;

        return {
          path: row.path,
          extension: row.extension,
          language: row.language as "typescript",
          role: row.role as "source",
          sizeBytes: row.size_bytes,
          linesOfCode: row.lines_of_code,
          frameworks: Array.isArray(row.frameworks) ? row.frameworks : [],
        };
      });

      return fileInventoryResponseSchema.parse({
        jobId,
        files,
        summary: {
          totalFiles: files.length,
          totalLines,
          byLanguage,
          byRole,
        },
      });
    } finally {
      client.release();
    }
  }

  async getSymbols(
    actor: string,
    workspace: string,
    jobId: string,
    filterKind?: string,
  ): Promise<SymbolInventoryResponse> {
    const client = await this.pool.connect();
    try {
      await this.authorize(client, actor, workspace);

      const query = filterKind
        ? "SELECT id, kind, data FROM analysis_symbols WHERE job_id=$1 AND kind=$2 ORDER BY id ASC"
        : "SELECT id, kind, data FROM analysis_symbols WHERE job_id=$1 ORDER BY id ASC";
      const params = filterKind ? [jobId, filterKind] : [jobId];

      const res = await client.query<{
        id: string;
        kind: string;
        data: unknown;
      }>(query, params);

      const functions: unknown[] = [];
      const classes: unknown[] = [];
      const interfaces: unknown[] = [];
      const types: unknown[] = [];
      const importsExports: unknown[] = [];

      for (const row of res.rows) {
        if (row.kind === "function" || row.kind === "method") {
          functions.push(row.data);
        } else if (row.kind === "class") {
          classes.push(row.data);
        } else if (row.kind === "interface") {
          interfaces.push(row.data);
        } else if (row.kind === "typeAlias") {
          types.push(row.data);
        } else if (row.kind === "import" || row.kind === "export") {
          importsExports.push(row.data);
        }
      }

      return symbolInventoryResponseSchema.parse({
        jobId,
        functions,
        classes,
        interfaces,
        types,
        importsExports,
        totalCount: res.rows.length,
      });
    } finally {
      client.release();
    }
  }

  async getDiagnostics(
    actor: string,
    workspace: string,
    jobId: string,
  ): Promise<DiagnosticsResponse> {
    const client = await this.pool.connect();
    try {
      await this.authorize(client, actor, workspace);

      const res = await client.query<{
        id: string;
        path: string;
        code: string;
        severity: "error" | "warning" | "info";
        message: string;
        location: unknown;
      }>(
        "SELECT id, path, code, severity, message, location FROM analysis_diagnostics WHERE job_id=$1 ORDER BY id ASC",
        [jobId],
      );

      let errorCount = 0;
      let warningCount = 0;

      const diagnostics = res.rows.map((row) => {
        if (row.severity === "error") errorCount++;
        if (row.severity === "warning") warningCount++;
        return {
          id: row.id,
          path: row.path,
          code: row.code,
          severity: row.severity,
          message: row.message,
          location: row.location ?? undefined,
        };
      });

      return diagnosticsResponseSchema.parse({
        jobId,
        diagnostics,
        errorCount,
        warningCount,
      });
    } finally {
      client.release();
    }
  }
}
