import type { Pool } from "pg";
import type {
  BackendOverviewResponse,
  BackendRoutesResponse,
  BackendControllersResponse,
  BackendServicesResponse,
  BackendRepositoriesResponse,
  BackendMiddlewareResponse,
  RequestFlowsResponse,
  BackendRouteDetailResponse,
  BackendRoute,
  BackendController,
  BackendService as BackendServiceModel,
  BackendRepository,
  BackendMiddleware,
  RequestFlow,
  BackendFramework,
  BackendHttpMethod,
  MiddlewareKind,
  RepositoryOrmKind,
} from "@codaryn/contracts";

export class BackendService {
  constructor(private readonly pool: Pool) {}

  private async verifyJobAccess(
    workspaceId: string,
    jobId: string,
  ): Promise<void> {
    const res = await this.pool.query<{ organization_id: string }>(
      "SELECT organization_id FROM analysis_jobs WHERE id=$1",
      [jobId],
    );
    const row = res.rows[0];
    if (!row || row.organization_id !== workspaceId) {
      throw new Error("Analysis job not found in workspace");
    }
  }

  async getOverview(
    workspaceId: string,
    jobId: string,
  ): Promise<BackendOverviewResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const routesCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_backend_routes WHERE job_id=$1",
      [jobId],
    );
    const controllersCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_backend_controllers WHERE job_id=$1",
      [jobId],
    );
    const servicesCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_backend_services WHERE job_id=$1",
      [jobId],
    );
    const reposCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_backend_repositories WHERE job_id=$1",
      [jobId],
    );
    const middlewareCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_backend_middleware WHERE job_id=$1",
      [jobId],
    );
    const flowsCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_backend_request_flows WHERE job_id=$1",
      [jobId],
    );

    const frameworksRes = await this.pool.query<{ framework: string }>(
      "SELECT DISTINCT framework FROM analysis_backend_routes WHERE job_id=$1 UNION SELECT DISTINCT framework FROM analysis_backend_controllers WHERE job_id=$1",
      [jobId],
    );
    const frameworks = frameworksRes.rows
      .map((r) => r.framework)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const middlewareKindsRes = await this.pool.query<{ kind: string }>(
      "SELECT DISTINCT kind FROM analysis_backend_middleware WHERE job_id=$1",
      [jobId],
    );
    const authPatterns = middlewareKindsRes.rows
      .filter((r) => r.kind === "auth")
      .map((r) => r.kind)
      .sort((a, b) => a.localeCompare(b));
    const validationPatterns = middlewareKindsRes.rows
      .filter((r) => r.kind === "validation")
      .map((r) => r.kind)
      .sort((a, b) => a.localeCompare(b));

    return {
      jobId,
      detectedFrameworks: frameworks,
      totalRoutes: Number.parseInt(routesCountRes.rows[0]?.count ?? "0", 10),
      totalControllers: Number.parseInt(
        controllersCountRes.rows[0]?.count ?? "0",
        10,
      ),
      totalServices: Number.parseInt(
        servicesCountRes.rows[0]?.count ?? "0",
        10,
      ),
      totalRepositories: Number.parseInt(
        reposCountRes.rows[0]?.count ?? "0",
        10,
      ),
      totalMiddleware: Number.parseInt(
        middlewareCountRes.rows[0]?.count ?? "0",
        10,
      ),
      totalRequestFlows: Number.parseInt(
        flowsCountRes.rows[0]?.count ?? "0",
        10,
      ),
      authenticationPatterns:
        authPatterns.length > 0 ? authPatterns : ["custom"],
      validationPatterns:
        validationPatterns.length > 0 ? validationPatterns : ["custom"],
    };
  }

  async getRoutes(
    workspaceId: string,
    jobId: string,
    options: {
      framework?: string;
      method?: string;
      search?: string;
    } = {},
  ): Promise<BackendRoutesResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const conditions: string[] = ["job_id = $1"];
    const values: unknown[] = [jobId];
    let idx = 2;

    if (options.framework) {
      conditions.push(`framework = $${idx++}`);
      values.push(options.framework);
    }
    if (options.method) {
      conditions.push(`method = $${idx++}`);
      values.push(options.method.toUpperCase());
    }
    if (options.search) {
      conditions.push(`(path ILIKE $${idx} OR handler_name ILIKE $${idx})`);
      values.push(`%${options.search}%`);
      idx++;
    }

    const whereClause = conditions.join(" AND ");
    const res = await this.pool.query<{
      id: string;
      framework: string;
      method: string;
      path: string;
      file_path: string;
      handler_name: string;
      handler_symbol_id: string | null;
      controller_name: string | null;
      middleware: string[];
      is_dynamic: boolean;
      source_evidence: unknown;
    }>(
      `SELECT * FROM analysis_backend_routes WHERE ${whereClause} ORDER BY path ASC`,
      values,
    );

    const routes: BackendRoute[] = res.rows.map((r) => ({
      id: r.id,
      framework: r.framework as BackendFramework,
      method: r.method as BackendHttpMethod,
      path: r.path,
      filePath: r.file_path,
      handlerName: r.handler_name,
      handlerSymbolId: r.handler_symbol_id,
      controllerName: r.controller_name,
      middleware: r.middleware ?? [],
      isDynamic: r.is_dynamic,
      sourceEvidence: (r.source_evidence as any) ?? {
        filePath: r.file_path,
        startLine: 1,
        endLine: 1,
      },
    }));

    return {
      jobId,
      routes,
      totalCount: routes.length,
    };
  }

  async getRouteDetail(
    workspaceId: string,
    jobId: string,
    routeId: string,
  ): Promise<BackendRouteDetailResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const routeRes = await this.pool.query<{
      id: string;
      framework: string;
      method: string;
      path: string;
      file_path: string;
      handler_name: string;
      handler_symbol_id: string | null;
      controller_name: string | null;
      middleware: string[];
      is_dynamic: boolean;
      source_evidence: unknown;
    }>("SELECT * FROM analysis_backend_routes WHERE job_id=$1 AND id=$2", [
      jobId,
      routeId,
    ]);

    const r = routeRes.rows[0];
    if (!r) {
      throw new Error(`Route with id ${routeId} not found`);
    }

    const route: BackendRoute = {
      id: r.id,
      framework: r.framework as BackendFramework,
      method: r.method as BackendHttpMethod,
      path: r.path,
      filePath: r.file_path,
      handlerName: r.handler_name,
      handlerSymbolId: r.handler_symbol_id,
      controllerName: r.controller_name,
      middleware: r.middleware ?? [],
      isDynamic: r.is_dynamic,
      sourceEvidence: (r.source_evidence as any) ?? {
        filePath: r.file_path,
        startLine: 1,
        endLine: 1,
      },
    };

    let controller: BackendController | null = null;
    if (route.controllerName) {
      const ctrlRes = await this.pool.query<{
        id: string;
        name: string;
        path: string;
        framework: string;
        routes_count: number;
        base_path: string | null;
        source_evidence: unknown;
      }>(
        "SELECT * FROM analysis_backend_controllers WHERE job_id=$1 AND name=$2",
        [jobId, route.controllerName],
      );
      const c = ctrlRes.rows[0];
      if (c) {
        controller = {
          id: c.id,
          name: c.name,
          filePath: c.path,
          framework: c.framework as BackendFramework,
          routesCount: c.routes_count,
          basePath: c.base_path,
          sourceEvidence: (c.source_evidence as any) ?? {
            filePath: c.path,
            startLine: 1,
            endLine: 1,
          },
        };
      }
    }

    const flowRes = await this.pool.query<{
      id: string;
      route_id: string;
      route_path: string;
      http_method: string;
      controller_name: string | null;
      service_names: string[];
      repository_names: string[];
      middleware_chain: string[];
      source_evidence: unknown;
    }>(
      "SELECT * FROM analysis_backend_request_flows WHERE job_id=$1 AND route_id=$2",
      [jobId, routeId],
    );

    let requestFlow: RequestFlow | null = null;
    const f = flowRes.rows[0];
    if (f) {
      requestFlow = {
        id: f.id,
        routeId: f.route_id,
        routePath: f.route_path,
        httpMethod: f.http_method as BackendHttpMethod,
        controllerName: f.controller_name,
        serviceNames: f.service_names ?? [],
        repositoryNames: f.repository_names ?? [],
        middlewareChain: f.middleware_chain ?? [],
        sourceEvidence: (f.source_evidence as any) ?? {
          filePath: route.filePath,
          startLine: 1,
          endLine: 1,
        },
      };
    }

    const services: BackendServiceModel[] = [];
    const serviceNames = requestFlow?.serviceNames ?? [];
    if (serviceNames.length > 0) {
      const svcRes = await this.pool.query<{
        id: string;
        name: string;
        path: string;
        methods: string[];
        injected_dependencies: string[];
        source_evidence: unknown;
      }>(
        "SELECT * FROM analysis_backend_services WHERE job_id=$1 AND name=ANY($2)",
        [jobId, serviceNames],
      );
      for (const s of svcRes.rows) {
        services.push({
          id: s.id,
          name: s.name,
          filePath: s.path,
          methods: s.methods ?? [],
          injectedDependencies: s.injected_dependencies ?? [],
          sourceEvidence: (s.source_evidence as any) ?? {
            filePath: s.path,
            startLine: 1,
            endLine: 1,
          },
        });
      }
    }

    const repositories: BackendRepository[] = [];
    const repositoryNames = requestFlow?.repositoryNames ?? [];
    if (repositoryNames.length > 0) {
      const repoRes = await this.pool.query<{
        id: string;
        name: string;
        path: string;
        orm_type: string;
        methods: string[];
        source_evidence: unknown;
      }>(
        "SELECT * FROM analysis_backend_repositories WHERE job_id=$1 AND name=ANY($2)",
        [jobId, repositoryNames],
      );
      for (const repo of repoRes.rows) {
        repositories.push({
          id: repo.id,
          name: repo.name,
          filePath: repo.path,
          ormType: repo.orm_type as RepositoryOrmKind,
          methods: repo.methods ?? [],
          sourceEvidence: (repo.source_evidence as any) ?? {
            filePath: repo.path,
            startLine: 1,
            endLine: 1,
          },
        });
      }
    }

    const middlewareChain: BackendMiddleware[] = [];
    const mwNames = requestFlow?.middlewareChain ?? route.middleware ?? [];
    if (mwNames.length > 0) {
      const mwRes = await this.pool.query<{
        id: string;
        name: string;
        path: string;
        kind: string;
        scope: string;
        source_evidence: unknown;
      }>(
        "SELECT * FROM analysis_backend_middleware WHERE job_id=$1 AND name=ANY($2)",
        [jobId, mwNames],
      );
      for (const mw of mwRes.rows) {
        middlewareChain.push({
          id: mw.id,
          name: mw.name,
          filePath: mw.path,
          kind: mw.kind as MiddlewareKind,
          scope: mw.scope as "route" | "router" | "global",
          sourceEvidence: (mw.source_evidence as any) ?? {
            filePath: mw.path,
            startLine: 1,
            endLine: 1,
          },
        });
      }
    }

    return {
      route,
      controller,
      services,
      repositories,
      middlewareChain,
      requestFlow,
    };
  }

  async getControllers(
    workspaceId: string,
    jobId: string,
    options: {
      framework?: string;
      search?: string;
    } = {},
  ): Promise<BackendControllersResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const conditions: string[] = ["job_id = $1"];
    const values: unknown[] = [jobId];
    let idx = 2;

    if (options.framework) {
      conditions.push(`framework = $${idx++}`);
      values.push(options.framework);
    }
    if (options.search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${options.search}%`);
    }

    const whereClause = conditions.join(" AND ");
    const res = await this.pool.query<{
      id: string;
      name: string;
      path: string;
      framework: string;
      routes_count: number;
      base_path: string | null;
      source_evidence: unknown;
    }>(
      `SELECT * FROM analysis_backend_controllers WHERE ${whereClause} ORDER BY name ASC`,
      values,
    );

    const controllers: BackendController[] = res.rows.map((c) => ({
      id: c.id,
      name: c.name,
      filePath: c.path,
      framework: c.framework as BackendFramework,
      routesCount: c.routes_count,
      basePath: c.base_path,
      sourceEvidence: (c.source_evidence as any) ?? {
        filePath: c.path,
        startLine: 1,
        endLine: 1,
      },
    }));

    return {
      jobId,
      controllers,
      totalCount: controllers.length,
    };
  }

  async getServices(
    workspaceId: string,
    jobId: string,
    options: { search?: string } = {},
  ): Promise<BackendServicesResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const conditions: string[] = ["job_id = $1"];
    const values: unknown[] = [jobId];
    let idx = 2;

    if (options.search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${options.search}%`);
    }

    const whereClause = conditions.join(" AND ");
    const res = await this.pool.query<{
      id: string;
      name: string;
      path: string;
      methods: string[];
      injected_dependencies: string[];
      source_evidence: unknown;
    }>(
      `SELECT * FROM analysis_backend_services WHERE ${whereClause} ORDER BY name ASC`,
      values,
    );

    const services: BackendServiceModel[] = res.rows.map((s) => ({
      id: s.id,
      name: s.name,
      filePath: s.path,
      methods: s.methods ?? [],
      injectedDependencies: s.injected_dependencies ?? [],
      sourceEvidence: (s.source_evidence as any) ?? {
        filePath: s.path,
        startLine: 1,
        endLine: 1,
      },
    }));

    return {
      jobId,
      services,
      totalCount: services.length,
    };
  }

  async getRepositories(
    workspaceId: string,
    jobId: string,
    options: { ormType?: string; search?: string } = {},
  ): Promise<BackendRepositoriesResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const conditions: string[] = ["job_id = $1"];
    const values: unknown[] = [jobId];
    let idx = 2;

    if (options.ormType) {
      conditions.push(`orm_type = $${idx++}`);
      values.push(options.ormType);
    }
    if (options.search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${options.search}%`);
    }

    const whereClause = conditions.join(" AND ");
    const res = await this.pool.query<{
      id: string;
      name: string;
      path: string;
      orm_type: string;
      methods: string[];
      source_evidence: unknown;
    }>(
      `SELECT * FROM analysis_backend_repositories WHERE ${whereClause} ORDER BY name ASC`,
      values,
    );

    const repositories: BackendRepository[] = res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      filePath: r.path,
      ormType: r.orm_type as RepositoryOrmKind,
      methods: r.methods ?? [],
      sourceEvidence: (r.source_evidence as any) ?? {
        filePath: r.path,
        startLine: 1,
        endLine: 1,
      },
    }));

    return {
      jobId,
      repositories,
      totalCount: repositories.length,
    };
  }

  async getMiddleware(
    workspaceId: string,
    jobId: string,
    options: { kind?: string; scope?: string; search?: string } = {},
  ): Promise<BackendMiddlewareResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const conditions: string[] = ["job_id = $1"];
    const values: unknown[] = [jobId];
    let idx = 2;

    if (options.kind) {
      conditions.push(`kind = $${idx++}`);
      values.push(options.kind);
    }
    if (options.scope) {
      conditions.push(`scope = $${idx++}`);
      values.push(options.scope);
    }
    if (options.search) {
      conditions.push(`name ILIKE $${idx++}`);
      values.push(`%${options.search}%`);
    }

    const whereClause = conditions.join(" AND ");
    const res = await this.pool.query<{
      id: string;
      name: string;
      path: string;
      kind: string;
      scope: string;
      source_evidence: unknown;
    }>(
      `SELECT * FROM analysis_backend_middleware WHERE ${whereClause} ORDER BY name ASC`,
      values,
    );

    const middleware: BackendMiddleware[] = res.rows.map((m) => ({
      id: m.id,
      name: m.name,
      filePath: m.path,
      kind: m.kind as MiddlewareKind,
      scope: m.scope as "route" | "router" | "global",
      sourceEvidence: (m.source_evidence as any) ?? {
        filePath: m.path,
        startLine: 1,
        endLine: 1,
      },
    }));

    return {
      jobId,
      middleware,
      totalCount: middleware.length,
    };
  }

  async getRequestFlows(
    workspaceId: string,
    jobId: string,
    options: { routePath?: string; httpMethod?: string } = {},
  ): Promise<RequestFlowsResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const conditions: string[] = ["job_id = $1"];
    const values: unknown[] = [jobId];
    let idx = 2;

    if (options.routePath) {
      conditions.push(`route_path ILIKE $${idx++}`);
      values.push(`%${options.routePath}%`);
    }
    if (options.httpMethod) {
      conditions.push(`http_method = $${idx++}`);
      values.push(options.httpMethod.toUpperCase());
    }

    const whereClause = conditions.join(" AND ");
    const res = await this.pool.query<{
      id: string;
      route_id: string;
      route_path: string;
      http_method: string;
      controller_name: string | null;
      service_names: string[];
      repository_names: string[];
      middleware_chain: string[];
      source_evidence: unknown;
    }>(
      `SELECT * FROM analysis_backend_request_flows WHERE ${whereClause} ORDER BY route_path ASC`,
      values,
    );

    const flows: RequestFlow[] = res.rows.map((f) => ({
      id: f.id,
      routeId: f.route_id,
      routePath: f.route_path,
      httpMethod: f.http_method as BackendHttpMethod,
      controllerName: f.controller_name,
      serviceNames: f.service_names ?? [],
      repositoryNames: f.repository_names ?? [],
      middlewareChain: f.middleware_chain ?? [],
      sourceEvidence: (f.source_evidence as any) ?? {
        filePath: f.route_path,
        startLine: 1,
        endLine: 1,
      },
    }));

    return {
      jobId,
      flows,
      totalCount: flows.length,
    };
  }
}
