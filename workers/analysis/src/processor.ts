import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type {
  AnalysisStageId,
  SourceFileClassification,
  TsconfigInfo,
} from "@codaryn/contracts";
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
import {
  SymbolLinker,
  type FileSymbolInventory,
} from "@codaryn/symbol-resolver";
import { DependencyGraphBuilder } from "@codaryn/dependency-graph";

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

      let classifiedFiles: SourceFileClassification[] = [];
      let discoveredConfigs: TsconfigInfo[] = [];
      const fileInventories: FileSymbolInventory[] = [];

      await this.runStage(client, jobId, "inventory", async () => {
        classifiedFiles = classifyRepositoryFiles(fileInputs);
        for (const file of classifiedFiles) {
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
          [classifiedFiles.length, jobId],
        );
        return {
          itemsTotal: classifiedFiles.length,
          itemsCompleted: classifiedFiles.length,
        };
      });

      if (await this.checkCancellation(client, jobId)) return;

      await this.runStage(client, jobId, "configuration", async () => {
        discoveredConfigs = discoverTsconfigs(fileMap);
        await this.log(
          client,
          jobId,
          "configuration",
          "info",
          `Discovered ${discoveredConfigs.length} tsconfig configurations`,
        );
        return {
          itemsTotal: discoveredConfigs.length,
          itemsCompleted: discoveredConfigs.length,
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
          const normalizedPath = sourceFile.fileName
            .replace(/\\/g, "/")
            .replace(/^\/+/, "");

          fileInventories.push({
            path: normalizedPath,
            functions: analysis.inventory.functions,
            classes: analysis.inventory.classes,
            interfaces: analysis.inventory.interfaces,
            types: analysis.inventory.types,
            importsExports: analysis.inventory.importsExports,
          });

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

      if (await this.checkCancellation(client, jobId)) return;

      await this.runStage(client, jobId, "graph", async () => {
        const rootConfig =
          discoveredConfigs.find((c) => c.path === "tsconfig.json") ??
          discoveredConfigs[0];
        const resolverOptions = {
          baseUrl:
            typeof rootConfig?.compilerOptions?.baseUrl === "string"
              ? rootConfig.compilerOptions.baseUrl
              : ".",
          paths: rootConfig?.compilerOptions?.paths as
            Record<string, string[]> | undefined,
        };

        const linker = new SymbolLinker(fileInventories, resolverOptions);
        const references = linker.resolveAllReferences(fileInventories);

        const graphBuilder = new DependencyGraphBuilder(
          jobId,
          classifiedFiles.map((c) => ({
            path: c.path,
            language: c.language,
            linesOfCode: c.linesOfCode,
          })),
        );
        graphBuilder.addReferences(references);
        const snapshot = graphBuilder.buildSnapshot();

        for (const node of snapshot.nodes) {
          await client.query(
            "INSERT INTO analysis_graph_nodes (id,job_id,kind,path,name,language,lines_of_code) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
            [
              node.id,
              jobId,
              node.kind,
              node.path,
              node.name,
              node.language ?? null,
              node.linesOfCode ?? null,
            ],
          );
        }

        for (const edge of snapshot.edges) {
          await client.query(
            "INSERT INTO analysis_graph_edges (id,job_id,source_id,target_id,kind,resolution,evidence,weight) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING",
            [
              edge.id,
              jobId,
              edge.sourceId,
              edge.targetId,
              edge.kind,
              edge.resolution,
              JSON.stringify(edge.evidence),
              edge.weight,
            ],
          );
        }

        for (const cycle of snapshot.cycles) {
          await client.query(
            "INSERT INTO analysis_graph_cycles (id,job_id,length,node_ids,path) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING",
            [
              cycle.id,
              jobId,
              cycle.length,
              JSON.stringify(cycle.nodeIds),
              JSON.stringify(cycle.path),
            ],
          );
        }

        for (const metric of snapshot.metrics) {
          await client.query(
            "INSERT INTO analysis_graph_metrics (job_id,path,afferent_coupling,efferent_coupling,instability,depth) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (job_id,path) DO NOTHING",
            [
              jobId,
              metric.path,
              metric.afferentCoupling,
              metric.efferentCoupling,
              metric.instability,
              metric.depth,
            ],
          );
        }

        for (const ref of references) {
          if (ref.status === "unresolved") {
            await client.query(
              "INSERT INTO analysis_unresolved_references (id,job_id,source_file,source_symbol_name,local_alias,module_specifier,status,evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING",
              [
                ref.id,
                jobId,
                ref.sourceFile,
                ref.sourceSymbolName,
                ref.localAlias ?? null,
                ref.moduleSpecifier,
                ref.status,
                JSON.stringify(ref.evidence),
              ],
            );
          }
        }

        await this.log(
          client,
          jobId,
          "graph",
          "info",
          `Graph synthesized: ${snapshot.totalNodes} nodes, ${snapshot.totalEdges} edges, ${snapshot.totalCycles} cycles`,
        );

        return {
          itemsTotal: snapshot.totalNodes + snapshot.totalEdges,
          itemsCompleted: snapshot.totalNodes + snapshot.totalEdges,
        };
      });

      if (await this.checkCancellation(client, jobId)) return;

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
    const stageId = randomUUID();
    const startTime = Date.now();

    await client.query(
      "INSERT INTO analysis_stages (id,job_id,stage,status,items_total,items_completed) VALUES ($1,$2,$3,'running',0,0) ON CONFLICT (job_id,stage) DO UPDATE SET status='running', updated_at=now()",
      [stageId, jobId, stage],
    );
    await client.query(
      "UPDATE analysis_jobs SET current_stage=$1, updated_at=now() WHERE id=$2",
      [stage, jobId],
    );

    try {
      const { itemsTotal, itemsCompleted } = await execute();
      const durationMs = Date.now() - startTime;

      await client.query(
        "UPDATE analysis_stages SET status='completed', items_total=$1, items_completed=$2, duration_ms=$3, updated_at=now() WHERE job_id=$4 AND stage=$5",
        [itemsTotal, itemsCompleted, durationMs, jobId, stage],
      );
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const message = err instanceof Error ? err.message : String(err);

      await client.query(
        "UPDATE analysis_stages SET status='failed', duration_ms=$1, message=$2, updated_at=now() WHERE job_id=$3 AND stage=$4",
        [durationMs, message, jobId, stage],
      );
      throw err;
    }
  }

  private async handleFailure(
    client: PoolClient,
    jobId: string,
    message: string,
  ): Promise<void> {
    const jobRes = await client.query<{
      retries: number;
      max_retries: number;
    }>("SELECT retries, max_retries FROM analysis_jobs WHERE id=$1", [jobId]);

    const job = jobRes.rows[0];
    if (job && job.retries < job.max_retries) {
      await client.query(
        "UPDATE analysis_jobs SET retries=retries+1, status='queued', failure_reason=$1, updated_at=now() WHERE id=$2",
        [message, jobId],
      );
      await this.log(
        client,
        jobId,
        "completed",
        "warn",
        `Job failed: ${message}. Retrying (${job.retries + 1}/${job.max_retries})`,
      );
    } else {
      await client.query(
        "UPDATE analysis_jobs SET status='failed', failure_reason=$1, updated_at=now() WHERE id=$2",
        [message, jobId],
      );
      await this.log(
        client,
        jobId,
        "completed",
        "error",
        `Job permanently failed: ${message}`,
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
      "INSERT INTO analysis_job_logs (id,job_id,stage,level,message) VALUES ($1,$2,$3,$4,$5)",
      [randomUUID(), jobId, stage, level, message],
    );
  }
}
