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
import {
  extractComponentsAndJsx,
  extractHooksAndContexts,
  extractRoutes,
  extractStateAndApiCalls,
} from "@codaryn/frontend-analyzer";
import {
  extractExpressRoutes,
  extractFastifyRoutes,
  extractNestJsControllersAndRoutes,
  extractServicesAndRepositories,
  linkRequestFlows,
} from "@codaryn/backend-analyzer";
import type {
  BackendRoute,
  BackendController,
  BackendService,
  BackendRepository,
  BackendMiddleware,
  RequestFlow,
} from "@codaryn/contracts";

export type AnalysisJobPayload = {
  jobId: string;
  files: Record<string, string>;
};

export class AnalysisProcessor {
  constructor(private readonly pool: Pool) {}

  async processJob(
    payload: AnalysisJobPayload,
    authorize?: (client: PoolClient) => Promise<void>,
  ): Promise<void> {
    const { jobId, files } = payload;
    const scoped = (id: string) => `${jobId}:${id}`;
    const client = await this.pool.connect();

    let committed = false;
    try {
      await client.query("BEGIN");
      await authorize?.(client);
      const isCancelled = await this.checkCancellation(client, jobId);
      if (isCancelled) return;

      for (const table of [
        "analysis_backend_request_flows",
        "analysis_backend_routes",
        "analysis_backend_controllers",
        "analysis_backend_services",
        "analysis_backend_repositories",
        "analysis_backend_middleware",
        "analysis_frontend_api_clients",
        "analysis_frontend_state",
        "analysis_frontend_hooks",
        "analysis_frontend_jsx_elements",
        "analysis_frontend_contexts",
        "analysis_frontend_routes",
        "analysis_frontend_components",
        "analysis_graph_edges",
        "analysis_graph_cycles",
        "analysis_graph_metrics",
        "analysis_unresolved_references",
        "analysis_graph_nodes",
        "analysis_diagnostics",
        "analysis_symbols",
        "analysis_files",
      ]) {
        await client.query(`DELETE FROM ${table} WHERE job_id=$1`, [jobId]);
      }

      await client.query(
        "UPDATE analysis_jobs SET status='running', updated_at=now() WHERE id=$1 AND status='queued'",
        [jobId],
      );

      const jobRes = await client.query<{ repository_id: string }>(
        "SELECT repository_id FROM analysis_jobs WHERE id=$1",
        [jobId],
      );
      const repositoryId =
        jobRes.rows[0]?.repository_id ?? "00000000-0000-0000-0000-000000000000";

      const fileMap: VirtualFileSystem = new Map(Object.entries(files));
      const fileInputs: FileInput[] = Object.entries(files).map(
        ([path, content]) => ({ path, content }),
      );

      const { program } = createAnalysisProgram(fileMap);
      const sourceFiles = program
        .getSourceFiles()
        .filter((sf) =>
          fileMap.has(sf.fileName.replace(/\\/g, "/").replace(/^\/+/, "")),
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
                scoped(fn.id),
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
                scoped(cls.id),
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
                scoped(iface.id),
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
                scoped(type.id),
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
                scoped(ie.id),
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
                scoped(diag.id),
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
              scoped(node.id),
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
              scoped(edge.id),
              jobId,
              scoped(edge.sourceId),
              scoped(edge.targetId),
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
              scoped(cycle.id),
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
                scoped(ref.id),
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

      await this.runStage(client, jobId, "frontend", async () => {
        let totalComponents = 0;
        let totalJsx = 0;
        let totalHooks = 0;
        let totalContexts = 0;
        let totalRoutes = 0;
        let totalState = 0;
        let totalApi = 0;

        for (const sf of sourceFiles) {
          const filePath = sf.fileName.replace(/\\/g, "/").replace(/^\/+/, "");
          if (
            !filePath.endsWith(".tsx") &&
            !filePath.endsWith(".jsx") &&
            !filePath.endsWith(".ts") &&
            !filePath.endsWith(".js")
          ) {
            continue;
          }

          const compResult = extractComponentsAndJsx(
            sf,
            repositoryId,
            filePath,
          );
          const hooksContextsResult = extractHooksAndContexts(
            sf,
            filePath,
            compResult.components,
          );
          const routesResult = extractRoutes(
            sf,
            filePath,
            hooksContextsResult.updatedComponents,
          );
          const stateApiResult = extractStateAndApiCalls(
            sf,
            filePath,
            hooksContextsResult.updatedComponents,
          );

          totalComponents += hooksContextsResult.updatedComponents.length;
          totalJsx += compResult.jsxElements.length;
          totalHooks += hooksContextsResult.hooks.length;
          totalContexts += hooksContextsResult.contexts.length;
          totalRoutes += routesResult.length;
          totalState += stateApiResult.state.length;
          totalApi += stateApiResult.apiCalls.length;

          for (const comp of hooksContextsResult.updatedComponents) {
            await client.query(
              "INSERT INTO analysis_frontend_components (id,job_id,name,path,kind,export_type,props,hooks_count,rendered_components_count,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING",
              [
                scoped(comp.id),
                jobId,
                comp.name,
                comp.filePath,
                comp.kind,
                comp.exportType,
                JSON.stringify(comp.props),
                comp.hooksCount,
                comp.renderedComponentsCount,
                JSON.stringify(comp.sourceEvidence),
              ],
            );
          }

          for (const jsx of compResult.jsxElements) {
            await client.query(
              "INSERT INTO analysis_frontend_jsx_elements (id,job_id,source_component_id,target_component_name,target_component_id,props,is_conditional,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING",
              [
                scoped(jsx.id),
                jobId,
                scoped(jsx.sourceComponentId),
                jsx.targetComponentName,
                jsx.targetComponentId ? scoped(jsx.targetComponentId) : null,
                jsx.props,
                jsx.isConditional,
                JSON.stringify(jsx.sourceEvidence),
              ],
            );
          }

          for (const hook of hooksContextsResult.hooks) {
            await client.query(
              "INSERT INTO analysis_frontend_hooks (id,job_id,component_id,name,kind,dependencies,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
              [
                scoped(hook.id),
                jobId,
                scoped(hook.componentId),
                hook.name,
                hook.kind,
                hook.dependencies ?? null,
                JSON.stringify(hook.sourceEvidence),
              ],
            );
          }

          for (const ctx of hooksContextsResult.contexts) {
            await client.query(
              "INSERT INTO analysis_frontend_contexts (id,job_id,name,path,default_value,provider_component_ids,consumer_component_ids,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING",
              [
                scoped(ctx.id),
                jobId,
                ctx.name,
                ctx.filePath,
                ctx.defaultValue ?? null,
                ctx.providerComponentIds.map(scoped),
                ctx.consumerComponentIds.map(scoped),
                JSON.stringify(ctx.sourceEvidence),
              ],
            );
          }

          for (const route of routesResult) {
            await client.query(
              "INSERT INTO analysis_frontend_routes (id,job_id,framework,route_path,path,component_name,component_id,dynamic_params,is_layout,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING",
              [
                scoped(route.id),
                jobId,
                route.framework,
                route.routePath,
                route.filePath,
                route.componentName ?? null,
                route.componentId ? scoped(route.componentId) : null,
                route.dynamicParams,
                route.isLayout,
                JSON.stringify(route.sourceEvidence),
              ],
            );
          }

          for (const st of stateApiResult.state) {
            await client.query(
              "INSERT INTO analysis_frontend_state (id,job_id,component_id,kind,identifier,initial_value,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
              [
                scoped(st.id),
                jobId,
                scoped(st.componentId),
                st.kind,
                st.identifier,
                st.initialValue ?? null,
                JSON.stringify(st.sourceEvidence),
              ],
            );
          }

          for (const apiCall of stateApiResult.apiCalls) {
            await client.query(
              "INSERT INTO analysis_frontend_api_clients (id,job_id,component_id,path,method,endpoint,is_dynamic,client_type,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING",
              [
                scoped(apiCall.id),
                jobId,
                scoped(apiCall.componentId),
                apiCall.filePath,
                apiCall.method,
                apiCall.endpoint,
                apiCall.isDynamic,
                apiCall.clientType,
                JSON.stringify(apiCall.sourceEvidence),
              ],
            );
          }
        }

        await this.log(
          client,
          jobId,
          "frontend",
          "info",
          `Frontend intelligence extracted: ${totalComponents} components, ${totalRoutes} routes, ${totalHooks} hooks, ${totalContexts} contexts, ${totalApi} api calls`,
        );

        return {
          itemsTotal: totalComponents + totalRoutes,
          itemsCompleted: totalComponents + totalRoutes,
        };
      });

      if (await this.checkCancellation(client, jobId)) return;

      await this.runStage(client, jobId, "backend", async () => {
        const allRoutes: BackendRoute[] = [];
        const allControllers: BackendController[] = [];
        const allServices: BackendService[] = [];
        const allRepositories: BackendRepository[] = [];
        const allMiddleware: BackendMiddleware[] = [];

        for (const sf of sourceFiles) {
          const filePath = sf.fileName.replace(/\\/g, "/").replace(/^\/+/, "");
          if (
            !filePath.endsWith(".ts") &&
            !filePath.endsWith(".js") &&
            !filePath.endsWith(".tsx") &&
            !filePath.endsWith(".jsx")
          ) {
            continue;
          }

          const expressRoutes = extractExpressRoutes(sf, filePath);
          allRoutes.push(...expressRoutes);

          const fastifyRoutes = extractFastifyRoutes(sf, filePath);
          allRoutes.push(...fastifyRoutes);

          const nestRes = extractNestJsControllersAndRoutes(sf, filePath);
          allControllers.push(...nestRes.controllers);
          allRoutes.push(...nestRes.routes);

          const srRes = extractServicesAndRepositories(sf, filePath);
          allServices.push(...srRes.services);
          allRepositories.push(...srRes.repositories);
          allMiddleware.push(...srRes.middleware);
        }

        const requestFlows = linkRequestFlows(
          allRoutes,
          allControllers,
          allServices,
          allRepositories,
        );

        for (const route of allRoutes) {
          await client.query(
            "INSERT INTO analysis_backend_routes (id,job_id,framework,method,path,file_path,handler_name,handler_symbol_id,controller_name,middleware,is_dynamic,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO NOTHING",
            [
              scoped(route.id),
              jobId,
              route.framework,
              route.method,
              route.path,
              route.filePath,
              route.handlerName,
              route.handlerSymbolId ? scoped(route.handlerSymbolId) : null,
              route.controllerName ?? null,
              route.middleware,
              route.isDynamic,
              JSON.stringify(route.sourceEvidence),
            ],
          );
        }

        for (const ctrl of allControllers) {
          await client.query(
            "INSERT INTO analysis_backend_controllers (id,job_id,name,path,framework,routes_count,base_path,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING",
            [
              scoped(ctrl.id),
              jobId,
              ctrl.name,
              ctrl.filePath,
              ctrl.framework,
              ctrl.routesCount,
              ctrl.basePath ?? null,
              JSON.stringify(ctrl.sourceEvidence),
            ],
          );
        }

        for (const svc of allServices) {
          await client.query(
            "INSERT INTO analysis_backend_services (id,job_id,name,path,methods,injected_dependencies,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
            [
              scoped(svc.id),
              jobId,
              svc.name,
              svc.filePath,
              svc.methods,
              svc.injectedDependencies,
              JSON.stringify(svc.sourceEvidence),
            ],
          );
        }

        for (const repo of allRepositories) {
          await client.query(
            "INSERT INTO analysis_backend_repositories (id,job_id,name,path,orm_type,methods,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
            [
              scoped(repo.id),
              jobId,
              repo.name,
              repo.filePath,
              repo.ormType,
              repo.methods,
              JSON.stringify(repo.sourceEvidence),
            ],
          );
        }

        for (const mw of allMiddleware) {
          await client.query(
            "INSERT INTO analysis_backend_middleware (id,job_id,name,path,kind,scope,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING",
            [
              scoped(mw.id),
              jobId,
              mw.name,
              mw.filePath,
              mw.kind,
              mw.scope,
              JSON.stringify(mw.sourceEvidence),
            ],
          );
        }

        for (const flow of requestFlows) {
          await client.query(
            "INSERT INTO analysis_backend_request_flows (id,job_id,route_id,route_path,http_method,controller_name,service_names,repository_names,middleware_chain,source_evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING",
            [
              scoped(flow.id),
              jobId,
              scoped(flow.routeId),
              flow.routePath,
              flow.httpMethod,
              flow.controllerName ?? null,
              flow.serviceNames,
              flow.repositoryNames,
              flow.middlewareChain,
              JSON.stringify(flow.sourceEvidence),
            ],
          );
        }

        await this.log(
          client,
          jobId,
          "backend",
          "info",
          `Backend intelligence extracted: ${allRoutes.length} routes, ${allControllers.length} controllers, ${allServices.length} services, ${allRepositories.length} repositories, ${allMiddleware.length} middleware, ${requestFlows.length} request flows`,
        );

        const itemsCount =
          allRoutes.length +
          allControllers.length +
          allServices.length +
          allRepositories.length +
          allMiddleware.length +
          requestFlows.length;

        return {
          itemsTotal: itemsCount,
          itemsCompleted: itemsCount,
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
      await authorize?.(client);
      await client.query("COMMIT");
      committed = true;
    } catch (error) {
      await client.query("ROLLBACK");
      if (authorize) throw error;
      await this.handleFailure(client, jobId, "ANALYSIS_FAILED");
    } finally {
      if (!committed) await client.query("ROLLBACK");
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
      "INSERT INTO analysis_logs (id,job_id,stage,level,message) VALUES ($1,$2,$3,$4,$5)",
      [randomUUID(), jobId, stage, level, message],
    );
  }
}
