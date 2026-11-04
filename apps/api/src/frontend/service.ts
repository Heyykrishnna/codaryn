import type { Pool } from "pg";
import type {
  FrontendOverviewResponse,
  FrontendComponentsResponse,
  FrontendComponentDetailResponse,
  FrontendRoutesResponse,
  FrontendHooksResponse,
  FrontendContextsResponse,
  FrontendStateResponse,
  FrontendApiClientsResponse,
  FrontendComponent,
  FrontendJsxElement,
  FrontendHookCall,
  FrontendContext,
  FrontendRoute,
  FrontendState,
  FrontendApiClientCall,
} from "@codaryn/contracts";

export class FrontendService {
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
  ): Promise<FrontendOverviewResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const compCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_frontend_components WHERE job_id=$1",
      [jobId],
    );
    const routeCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_frontend_routes WHERE job_id=$1",
      [jobId],
    );
    const hookCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_frontend_hooks WHERE job_id=$1",
      [jobId],
    );
    const contextCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_frontend_contexts WHERE job_id=$1",
      [jobId],
    );
    const apiCountRes = await this.pool.query<{ count: string }>(
      "SELECT count(*) as count FROM analysis_frontend_api_clients WHERE job_id=$1",
      [jobId],
    );

    const frameworksRes = await this.pool.query<{ framework: string }>(
      "SELECT DISTINCT framework FROM analysis_frontend_routes WHERE job_id=$1",
      [jobId],
    );
    const frameworks = frameworksRes.rows
      .map((r) => r.framework)
      .sort((a, b) => a.localeCompare(b));

    const stateKindsRes = await this.pool.query<{ kind: string }>(
      "SELECT DISTINCT kind FROM analysis_frontend_state WHERE job_id=$1",
      [jobId],
    );
    const stateManagementPatterns = stateKindsRes.rows
      .map((r) => r.kind)
      .sort((a, b) => a.localeCompare(b));

    return {
      jobId,
      detectedFrameworks: frameworks,
      totalComponents: Number.parseInt(compCountRes.rows[0]?.count ?? "0", 10),
      totalRoutes: Number.parseInt(routeCountRes.rows[0]?.count ?? "0", 10),
      totalHooks: Number.parseInt(hookCountRes.rows[0]?.count ?? "0", 10),
      totalContexts: Number.parseInt(contextCountRes.rows[0]?.count ?? "0", 10),
      totalApiClients: Number.parseInt(apiCountRes.rows[0]?.count ?? "0", 10),
      stateManagementPatterns,
    };
  }

  async getComponents(
    workspaceId: string,
    jobId: string,
    query?: { search?: string; kind?: string },
  ): Promise<FrontendComponentsResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    let sql =
      "SELECT id, name, path, kind, export_type, props, hooks_count, rendered_components_count, source_evidence FROM analysis_frontend_components WHERE job_id=$1";
    const params: unknown[] = [jobId];

    if (query?.kind) {
      params.push(query.kind);
      sql += ` AND kind=$${params.length}`;
    }

    if (query?.search) {
      params.push(`%${query.search.toLowerCase()}%`);
      sql += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(path) LIKE $${params.length})`;
    }

    sql += " ORDER BY path ASC, name ASC";
    const res = await this.pool.query<{
      id: string;
      name: string;
      path: string;
      kind: FrontendComponent["kind"];
      export_type: FrontendComponent["exportType"];
      props: unknown;
      hooks_count: number;
      rendered_components_count: number;
      source_evidence: unknown;
    }>(sql, params);

    const components: FrontendComponent[] = res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      filePath: r.path,
      kind: r.kind,
      exportType: r.export_type,
      props: typeof r.props === "string" ? JSON.parse(r.props) : r.props,
      hooksCount: r.hooks_count,
      renderedComponentsCount: r.rendered_components_count,
      sourceEvidence:
        typeof r.source_evidence === "string"
          ? JSON.parse(r.source_evidence)
          : r.source_evidence,
    }));

    return {
      jobId,
      components,
      totalCount: components.length,
    };
  }

  async getComponentDetail(
    workspaceId: string,
    jobId: string,
    componentId: string,
  ): Promise<FrontendComponentDetailResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const compRes = await this.pool.query<{
      id: string;
      name: string;
      path: string;
      kind: FrontendComponent["kind"];
      export_type: FrontendComponent["exportType"];
      props: unknown;
      hooks_count: number;
      rendered_components_count: number;
      source_evidence: unknown;
    }>(
      "SELECT id, name, path, kind, export_type, props, hooks_count, rendered_components_count, source_evidence FROM analysis_frontend_components WHERE job_id=$1 AND id=$2",
      [jobId, componentId],
    );

    const r = compRes.rows[0];
    if (!r) {
      throw new Error(`Component not found: ${componentId}`);
    }

    const component: FrontendComponent = {
      id: r.id,
      name: r.name,
      filePath: r.path,
      kind: r.kind,
      exportType: r.export_type,
      props: typeof r.props === "string" ? JSON.parse(r.props) : r.props,
      hooksCount: r.hooks_count,
      renderedComponentsCount: r.rendered_components_count,
      sourceEvidence:
        typeof r.source_evidence === "string"
          ? JSON.parse(r.source_evidence)
          : r.source_evidence,
    };

    const renderedRes = await this.pool.query<{
      id: string;
      source_component_id: string;
      target_component_name: string;
      target_component_id: string | null;
      props: string[];
      is_conditional: boolean;
      source_evidence: unknown;
    }>(
      "SELECT id, source_component_id, target_component_name, target_component_id, props, is_conditional, source_evidence FROM analysis_frontend_jsx_elements WHERE job_id=$1 AND source_component_id=$2 ORDER BY id ASC",
      [jobId, componentId],
    );

    const renderedComponents: FrontendJsxElement[] = renderedRes.rows.map(
      (row) => ({
        id: row.id,
        sourceComponentId: row.source_component_id,
        targetComponentName: row.target_component_name,
        targetComponentId: row.target_component_id,
        props: row.props,
        isConditional: row.is_conditional,
        sourceEvidence:
          typeof row.source_evidence === "string"
            ? JSON.parse(row.source_evidence)
            : row.source_evidence,
      }),
    );

    const incomingRes = await this.pool.query<{
      id: string;
      source_component_id: string;
      target_component_name: string;
      target_component_id: string | null;
      props: string[];
      is_conditional: boolean;
      source_evidence: unknown;
    }>(
      "SELECT id, source_component_id, target_component_name, target_component_id, props, is_conditional, source_evidence FROM analysis_frontend_jsx_elements WHERE job_id=$1 AND (target_component_id=$2 OR target_component_name=$3) ORDER BY id ASC",
      [jobId, componentId, component.name],
    );

    const incomingRenders: FrontendJsxElement[] = incomingRes.rows.map(
      (row) => ({
        id: row.id,
        sourceComponentId: row.source_component_id,
        targetComponentName: row.target_component_name,
        targetComponentId: row.target_component_id,
        props: row.props,
        isConditional: row.is_conditional,
        sourceEvidence:
          typeof row.source_evidence === "string"
            ? JSON.parse(row.source_evidence)
            : row.source_evidence,
      }),
    );

    const hooksRes = await this.pool.query<{
      id: string;
      component_id: string;
      name: string;
      kind: FrontendHookCall["kind"];
      dependencies: string[] | null;
      source_evidence: unknown;
    }>(
      "SELECT id, component_id, name, kind, dependencies, source_evidence FROM analysis_frontend_hooks WHERE job_id=$1 AND component_id=$2 ORDER BY id ASC",
      [jobId, componentId],
    );

    const hooks: FrontendHookCall[] = hooksRes.rows.map((row) => ({
      id: row.id,
      componentId: row.component_id,
      name: row.name,
      kind: row.kind,
      dependencies: row.dependencies ?? undefined,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    const stateRes = await this.pool.query<{
      id: string;
      component_id: string;
      kind: FrontendState["kind"];
      identifier: string;
      initial_value: string | null;
      source_evidence: unknown;
    }>(
      "SELECT id, component_id, kind, identifier, initial_value, source_evidence FROM analysis_frontend_state WHERE job_id=$1 AND component_id=$2 ORDER BY id ASC",
      [jobId, componentId],
    );

    const state: FrontendState[] = stateRes.rows.map((row) => ({
      id: row.id,
      componentId: row.component_id,
      kind: row.kind,
      identifier: row.identifier,
      initialValue: row.initial_value ?? undefined,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    const contextRes = await this.pool.query<{
      id: string;
      name: string;
      path: string;
      default_value: string | null;
      provider_component_ids: string[];
      consumer_component_ids: string[];
      source_evidence: unknown;
    }>(
      "SELECT id, name, path, default_value, provider_component_ids, consumer_component_ids, source_evidence FROM analysis_frontend_contexts WHERE job_id=$1 AND $2 = ANY(consumer_component_ids) ORDER BY name ASC",
      [jobId, componentId],
    );

    const contextsConsumed: FrontendContext[] = contextRes.rows.map((row) => ({
      id: row.id,
      name: row.name,
      filePath: row.path,
      defaultValue: row.default_value ?? undefined,
      providerComponentIds: row.provider_component_ids,
      consumerComponentIds: row.consumer_component_ids,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    const apiRes = await this.pool.query<{
      id: string;
      component_id: string;
      path: string;
      method: FrontendApiClientCall["method"];
      endpoint: string;
      is_dynamic: boolean;
      client_type: FrontendApiClientCall["clientType"];
      source_evidence: unknown;
    }>(
      "SELECT id, component_id, path, method, endpoint, is_dynamic, client_type, source_evidence FROM analysis_frontend_api_clients WHERE job_id=$1 AND component_id=$2 ORDER BY id ASC",
      [jobId, componentId],
    );

    const apiCalls: FrontendApiClientCall[] = apiRes.rows.map((row) => ({
      id: row.id,
      componentId: row.component_id,
      filePath: row.path,
      method: row.method,
      endpoint: row.endpoint,
      isDynamic: row.is_dynamic,
      clientType: row.client_type,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    return {
      component,
      renderedComponents,
      hooks,
      state,
      contextsConsumed,
      apiCalls,
      incomingRenders,
    };
  }

  async getRoutes(
    workspaceId: string,
    jobId: string,
    query?: { framework?: string },
  ): Promise<FrontendRoutesResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    let sql =
      "SELECT id, framework, route_path, path, component_name, component_id, dynamic_params, is_layout, source_evidence FROM analysis_frontend_routes WHERE job_id=$1";
    const params: unknown[] = [jobId];

    if (query?.framework) {
      params.push(query.framework);
      sql += ` AND framework=$${params.length}`;
    }

    sql += " ORDER BY route_path ASC";
    const res = await this.pool.query<{
      id: string;
      framework: FrontendRoute["framework"];
      route_path: string;
      path: string;
      component_name: string | null;
      component_id: string | null;
      dynamic_params: string[];
      is_layout: boolean;
      source_evidence: unknown;
    }>(sql, params);

    const routes: FrontendRoute[] = res.rows.map((row) => ({
      id: row.id,
      framework: row.framework,
      routePath: row.route_path,
      filePath: row.path,
      componentName: row.component_name ?? undefined,
      componentId: row.component_id,
      dynamicParams: row.dynamic_params,
      isLayout: row.is_layout,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    return {
      jobId,
      routes,
      totalCount: routes.length,
    };
  }

  async getHooks(
    workspaceId: string,
    jobId: string,
    query?: { componentId?: string; kind?: string },
  ): Promise<FrontendHooksResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    let sql =
      "SELECT id, component_id, name, kind, dependencies, source_evidence FROM analysis_frontend_hooks WHERE job_id=$1";
    const params: unknown[] = [jobId];

    if (query?.componentId) {
      params.push(query.componentId);
      sql += ` AND component_id=$${params.length}`;
    }

    if (query?.kind) {
      params.push(query.kind);
      sql += ` AND kind=$${params.length}`;
    }

    sql += " ORDER BY name ASC";
    const res = await this.pool.query<{
      id: string;
      component_id: string;
      name: string;
      kind: FrontendHookCall["kind"];
      dependencies: string[] | null;
      source_evidence: unknown;
    }>(sql, params);

    const hooks: FrontendHookCall[] = res.rows.map((row) => ({
      id: row.id,
      componentId: row.component_id,
      name: row.name,
      kind: row.kind,
      dependencies: row.dependencies ?? undefined,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    return {
      jobId,
      hooks,
      totalCount: hooks.length,
    };
  }

  async getContexts(
    workspaceId: string,
    jobId: string,
  ): Promise<FrontendContextsResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const res = await this.pool.query<{
      id: string;
      name: string;
      path: string;
      default_value: string | null;
      provider_component_ids: string[];
      consumer_component_ids: string[];
      source_evidence: unknown;
    }>(
      "SELECT id, name, path, default_value, provider_component_ids, consumer_component_ids, source_evidence FROM analysis_frontend_contexts WHERE job_id=$1 ORDER BY name ASC",
      [jobId],
    );

    const contexts: FrontendContext[] = res.rows.map((row) => ({
      id: row.id,
      name: row.name,
      filePath: row.path,
      defaultValue: row.default_value ?? undefined,
      providerComponentIds: row.provider_component_ids,
      consumerComponentIds: row.consumer_component_ids,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    return {
      jobId,
      contexts,
      totalCount: contexts.length,
    };
  }

  async getState(
    workspaceId: string,
    jobId: string,
    query?: { componentId?: string; kind?: string },
  ): Promise<FrontendStateResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    let sql =
      "SELECT id, component_id, kind, identifier, initial_value, source_evidence FROM analysis_frontend_state WHERE job_id=$1";
    const params: unknown[] = [jobId];

    if (query?.componentId) {
      params.push(query.componentId);
      sql += ` AND component_id=$${params.length}`;
    }

    if (query?.kind) {
      params.push(query.kind);
      sql += ` AND kind=$${params.length}`;
    }

    sql += " ORDER BY identifier ASC";
    const res = await this.pool.query<{
      id: string;
      component_id: string;
      kind: FrontendState["kind"];
      identifier: string;
      initial_value: string | null;
      source_evidence: unknown;
    }>(sql, params);

    const state: FrontendState[] = res.rows.map((row) => ({
      id: row.id,
      componentId: row.component_id,
      kind: row.kind,
      identifier: row.identifier,
      initialValue: row.initial_value ?? undefined,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    return {
      jobId,
      state,
      totalCount: state.length,
    };
  }

  async getApiClients(
    workspaceId: string,
    jobId: string,
    query?: { componentId?: string; clientType?: string },
  ): Promise<FrontendApiClientsResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    let sql =
      "SELECT id, component_id, path, method, endpoint, is_dynamic, client_type, source_evidence FROM analysis_frontend_api_clients WHERE job_id=$1";
    const params: unknown[] = [jobId];

    if (query?.componentId) {
      params.push(query.componentId);
      sql += ` AND component_id=$${params.length}`;
    }

    if (query?.clientType) {
      params.push(query.clientType);
      sql += ` AND client_type=$${params.length}`;
    }

    sql += " ORDER BY endpoint ASC";
    const res = await this.pool.query<{
      id: string;
      component_id: string;
      path: string;
      method: FrontendApiClientCall["method"];
      endpoint: string;
      is_dynamic: boolean;
      client_type: FrontendApiClientCall["clientType"];
      source_evidence: unknown;
    }>(sql, params);

    const apiCalls: FrontendApiClientCall[] = res.rows.map((row) => ({
      id: row.id,
      componentId: row.component_id,
      filePath: row.path,
      method: row.method,
      endpoint: row.endpoint,
      isDynamic: row.is_dynamic,
      clientType: row.client_type,
      sourceEvidence:
        typeof row.source_evidence === "string"
          ? JSON.parse(row.source_evidence)
          : row.source_evidence,
    }));

    return {
      jobId,
      apiCalls,
      totalCount: apiCalls.length,
    };
  }
}
