import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AnalysisStageId } from "@codaryn/contracts";
import {
  classifyRepositoryFiles,
  type FileInput,
} from "@codaryn/file-classifier";
import {
  createAnalysisProgram,
  discoverTsconfigs,
  type VirtualFileSystem,
} from "@codaryn/compiler";
import { extractFileSymbols } from "@codaryn/ast";

export type AnalysisJobPayload = {
  jobId: string;
  files: Record<string, string>;
};

export class AnalysisProcessor {
  constructor(private readonly pool: Pool) {}

  async processJob(payload: AnalysisJobPayload): Promise<void> {
    const { jobId, files } = payload;
    const client = await this.pool.connect();

    try {
      const isCancelled = await this.checkCancellation(client, jobId);
      if (isCancelled) return;

      await client.query(
        "UPDATE analysis_jobs SET status='running', updated_at=now() WHERE id=$1 AND status='queued'",
        [jobId],
      );

      const fileMap: VirtualFileSystem = new Map(Object.entries(files));
      const fileInputs: FileInput[] = Object.entries(files).map(
        ([path, content]) => ({ path, content }),
      );

      await this.runStage(client, jobId, "inventory", async () => {
        const classified = classifyRepositoryFiles(fileInputs);
        for (const file of classified) {
          await client.query(
            "INSERT INTO analysis_files (id,job_id,path,extension,language,role,size_bytes,lines_of_code,frameworks) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (job_id,path) DO NOTHING",
            [
              randomUUID(),
              jobId,
              file.path,
              file.extension,
              file.language,
              file.role,
              file.sizeBytes,
              file.linesOfCode,
              JSON.stringify(file.frameworks),
            ],
          );
        }
        await client.query(
          "UPDATE analysis_jobs SET file_count=$1, updated_at=now() WHERE id=$2",
          [classified.length, jobId],
        );
        return {
          itemsTotal: classified.length,
          itemsCompleted: classified.length,
        };
      });

      if (await this.checkCancellation(client, jobId)) return;

      await this.runStage(client, jobId, "configuration", async () => {
        const tsconfigs = discoverTsconfigs(fileMap);
        await this.log(
          client,
          jobId,
          "configuration",
          "info",
          `Discovered ${tsconfigs.length} tsconfig configurations`,
        );
        return {
          itemsTotal: tsconfigs.length,
          itemsCompleted: tsconfigs.length,
        };
      });

      if (await this.checkCancellation(client, jobId)) return;

      let extractedCount = 0;
      let diagCount = 0;

      await this.runStage(client, jobId, "parsing", async () => {
        const { program } = createAnalysisProgram(fileMap);
        const sourceFiles = program
          .getSourceFiles()
          .filter((sf) =>
            fileMap.has(sf.fileName.replace(/\\/g, "/").replace(/^\/+/, "")),
          );

        for (const sourceFile of sourceFiles) {
          if (await this.checkCancellation(client, jobId)) break;

          const analysis = extractFileSymbols(sourceFile);

          for (const fn of analysis.inventory.functions) {
            await client.query(
              "INSERT INTO analysis_symbols (id,job_id,path,name,kind,data,location) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
              [
                fn.id,
                jobId,
                fn.location.path,
                fn.name,
                fn.kind,
                JSON.stringify(fn),
                JSON.stringify(fn.location),
              ],
            );
            extractedCount++;
          }

          for (const cls of analysis.inventory.classes) {
            await client.query(
              "INSERT INTO analysis_symbols (id,job_id,path,name,kind,data,location) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
              [
                cls.id,
                jobId,
                cls.location.path,
                cls.name,
                "class",
                JSON.stringify(cls),
                JSON.stringify(cls.location),
              ],
            );
            extractedCount++;
          }

          for (const iface of analysis.inventory.interfaces) {
            await client.query(
              "INSERT INTO analysis_symbols (id,job_id,path,name,kind,data,location) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
              [
                iface.id,
                jobId,
                iface.location.path,
                iface.name,
                "interface",
                JSON.stringify(iface),
                JSON.stringify(iface.location),
              ],
            );
            extractedCount++;
          }

          for (const type of analysis.inventory.types) {
            await client.query(
              "INSERT INTO analysis_symbols (id,job_id,path,name,kind,data,location) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
              [
                type.id,
                jobId,
                type.location.path,
                type.name,
                "typeAlias",
                JSON.stringify(type),
                JSON.stringify(type.location),
              ],
            );
            extractedCount++;
          }

          for (const ie of analysis.inventory.importsExports) {
            await client.query(
              "INSERT INTO analysis_symbols (id,job_id,path,name,kind,data,location) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
              [
                ie.id,
                jobId,
                ie.location.path,
                ie.moduleSpecifier || ie.kind,
                ie.kind,
                JSON.stringify(ie),
                JSON.stringify(ie.location),
              ],
            );
            extractedCount++;
          }

          for (const diag of analysis.diagnostics) {
            await client.query(
              "INSERT INTO analysis_diagnostics (id,job_id,path,code,severity,message,location) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
              [
                diag.id,
                jobId,
                diag.path,
                diag.code,
                diag.severity,
                diag.message,
                JSON.stringify(diag.location ?? null),
              ],
            );
            diagCount++;
          }
        }

        return {
          itemsTotal: sourceFiles.length,
          itemsCompleted: sourceFiles.length,
        };
      });

      if (await this.checkCancellation(client, jobId)) return;

      await this.runStage(client, jobId, "symbols", async () => {
        await client.query(
          "UPDATE analysis_jobs SET symbol_count=$1, updated_at=now() WHERE id=$2",
          [extractedCount, jobId],
        );
        return { itemsTotal: extractedCount, itemsCompleted: extractedCount };
      });

      await this.runStage(client, jobId, "diagnostics", async () => {
        await client.query(
          "UPDATE analysis_jobs SET diagnostic_count=$1, updated_at=now() WHERE id=$2",
          [diagCount, jobId],
        );
        return { itemsTotal: diagCount, itemsCompleted: diagCount };
      });

      await client.query(
        "UPDATE analysis_jobs SET status='completed', current_stage='completed', completed_at=now(), updated_at=now() WHERE id=$1 AND status='running'",
        [jobId],
      );
      await this.log(
        client,
        jobId,
        "completed",
        "info",
        "Analysis completed successfully",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.handleFailure(client, jobId, message);
    } finally {
      client.release();
    }
  }

  private async checkCancellation(
    client: PoolClient,
    jobId: string,
  ): Promise<boolean> {
    const res = await client.query<{ status: string }>(
      "SELECT status FROM analysis_jobs WHERE id=$1",
      [jobId],
    );
    return res.rows[0]?.status === "cancelled";
  }

  private async runStage(
    client: PoolClient,
    jobId: string,
    stage: AnalysisStageId,
    execute: () => Promise<{ itemsTotal: number; itemsCompleted: number }>,
  ): Promise<void> {
    const startTime = Date.now();
    await client.query(
      "UPDATE analysis_jobs SET current_stage=$1, updated_at=now() WHERE id=$2",
      [stage, jobId],
    );

    const stageId = randomUUID();
    await client.query(
      "INSERT INTO analysis_stages (id,job_id,stage,status,created_at,updated_at) VALUES ($1,$2,$3,'running',now(),now()) ON CONFLICT (job_id,stage) DO UPDATE SET status='running', updated_at=now()",
      [stageId, jobId, stage],
    );

    const { itemsTotal, itemsCompleted } = await execute();
    const durationMs = Date.now() - startTime;

    await client.query(
      "UPDATE analysis_stages SET status='completed', items_total=$1, items_completed=$2, duration_ms=$3, updated_at=now() WHERE job_id=$4 AND stage=$5",
      [itemsTotal, itemsCompleted, durationMs, jobId, stage],
    );
  }

  private async handleFailure(
    client: PoolClient,
    jobId: string,
    reason: string,
  ): Promise<void> {
    const jobRes = await client.query<{ retries: number; max_retries: number }>(
      "SELECT retries, max_retries FROM analysis_jobs WHERE id=$1",
      [jobId],
    );
    const job = jobRes.rows[0];
    const currentRetries = (job?.retries ?? 0) + 1;
    const maxRetries = job?.max_retries ?? 3;

    if (currentRetries < maxRetries) {
      await client.query(
        "UPDATE analysis_jobs SET retries=$1, failure_reason=$2, updated_at=now() WHERE id=$3",
        [currentRetries, reason, jobId],
      );
      await this.log(
        client,
        jobId,
        "inventory",
        "warn",
        `Job execution failed (attempt ${currentRetries}/${maxRetries}): ${reason}. Retry scheduled.`,
      );
    } else {
      await client.query(
        "UPDATE analysis_jobs SET status='failed', failure_reason=$1, retries=$2, completed_at=now(), updated_at=now() WHERE id=$3",
        [reason, currentRetries, jobId],
      );
      await this.log(
        client,
        jobId,
        "completed",
        "error",
        `Job failed permanently after ${currentRetries} attempts: ${reason}`,
      );
    }
  }

  private async log(
    client: PoolClient,
    jobId: string,
    stage: AnalysisStageId,
    level: "info" | "warn" | "error",
    message: string,
  ): Promise<void> {
    await client.query(
      "INSERT INTO analysis_logs (id,job_id,stage,level,message,created_at) VALUES ($1,$2,$3,$4,$5,now())",
      [randomUUID(), jobId, stage, level, message],
    );
  }
}
