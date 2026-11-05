import { authorizeAnalysisRead } from "../http/analysis-read.js";
import type { Pool } from "pg";
import type {
  DependencyCycle,
  DependencyEdge,
  DependencyNode,
  GraphSnapshotResponse,
  ModuleCouplingMetric,
  ResolvedSymbolReference,
  UnresolvedReferencesResponse,
} from "@codaryn/contracts";

export class GraphService {
  constructor(private readonly pool: Pool) {}
  authorize(actor: string, workspace: string, job: string) {
    return authorizeAnalysisRead(this.pool, actor, workspace, job);
  }

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

  async getSnapshot(
    workspaceId: string,
    jobId: string,
    query?: {
      search?: string;
      kind?: string;
      resolution?: string;
      page?: number;
    },
  ): Promise<GraphSnapshotResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    let nodeSql =
      "SELECT id, job_id, kind, path, name, language, lines_of_code FROM analysis_graph_nodes WHERE job_id=$1";
    const nodeParams: unknown[] = [jobId];

    if (query?.kind) {
      nodeParams.push(query.kind);
      nodeSql += ` AND kind=$${nodeParams.length}`;
    }

    if (query?.search) {
      nodeParams.push(`%${query.search.toLowerCase()}%`);
      nodeSql += ` AND (LOWER(path) LIKE $${nodeParams.length} OR LOWER(name) LIKE $${nodeParams.length})`;
    }

    const page = Math.min(1000, Math.max(1, query?.page ?? 1));
    const countRes = await this.pool.query<{ count: string }>(
      `SELECT count(*) AS count FROM (${nodeSql}) visible`,
      nodeParams,
    );
    nodeParams.push((page - 1) * 200);
    nodeSql += ` ORDER BY path ASC,id ASC LIMIT 200 OFFSET $${nodeParams.length}`;
    const nodeRes = await this.pool.query<{
      id: string;
      job_id: string;
      kind: DependencyNode["kind"];
      path: string;
      name: string;
      language?: string;
      lines_of_code?: number;
    }>(nodeSql, nodeParams);

    const nodes: DependencyNode[] = nodeRes.rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      kind: r.kind,
      path: r.path,
      name: r.name,
      language: r.language ?? undefined,
      linesOfCode: r.lines_of_code ?? undefined,
    }));

    let edgeSql =
      "SELECT id, job_id, source_id, target_id, kind, resolution, evidence, weight FROM analysis_graph_edges WHERE job_id=$1";
    const edgeParams: unknown[] = [jobId];

    if (query?.resolution) {
      edgeParams.push(query.resolution);
      edgeSql += ` AND resolution=$${edgeParams.length}`;
    }

    edgeParams.push(nodes.map((node) => node.id));
    edgeSql += ` AND source_id=ANY($${edgeParams.length}::text[]) AND target_id=ANY($${edgeParams.length}::text[]) ORDER BY id ASC LIMIT 400`;
    const edgeRes = await this.pool.query<{
      id: string;
      job_id: string;
      source_id: string;
      target_id: string;
      kind: DependencyEdge["kind"];
      resolution: DependencyEdge["resolution"];
      evidence: DependencyEdge["evidence"];
      weight: number;
    }>(edgeSql, edgeParams);

    const edges: DependencyEdge[] = edgeRes.rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      sourceId: r.source_id,
      targetId: r.target_id,
      kind: r.kind,
      resolution: r.resolution,
      evidence: r.evidence,
      weight: r.weight,
    }));

    const cycleRes = await this.pool.query<{
      id: string;
      job_id: string;
      length: number;
      node_ids: string[];
      path: string[];
    }>(
      "SELECT id, job_id, length, node_ids, path FROM analysis_graph_cycles WHERE job_id=$1 ORDER BY id ASC LIMIT 200",
      [jobId],
    );

    const cycles: DependencyCycle[] = cycleRes.rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      length: r.length,
      nodeIds: r.node_ids,
      path: r.path,
    }));

    const metricRes = await this.pool.query<{
      job_id: string;
      path: string;
      afferent_coupling: number;
      efferent_coupling: number;
      instability: string;
      depth: number;
    }>(
      "SELECT job_id, path, afferent_coupling, efferent_coupling, instability, depth FROM analysis_graph_metrics WHERE job_id=$1 ORDER BY path ASC LIMIT 200",
      [jobId],
    );

    const metrics: ModuleCouplingMetric[] = metricRes.rows.map((r) => ({
      jobId: r.job_id,
      path: r.path,
      afferentCoupling: r.afferent_coupling,
      efferentCoupling: r.efferent_coupling,
      instability: Number(r.instability),
      depth: r.depth,
    }));

    return {
      jobId,
      nodes,
      edges,
      cycles,
      metrics,
      totalNodes: Number(countRes.rows[0]?.count ?? nodes.length),
      page,
      pageSize: 200,
      hasMore: Number(countRes.rows[0]?.count ?? nodes.length) > page * 200,
      truncated:
        edges.length === 400 || cycles.length === 200 || metrics.length === 200,
      totalEdges: edges.length,
      totalCycles: cycles.length,
    };
  }

  async getNeighborhood(
    workspaceId: string,
    jobId: string,
    nodeId: string,
    depth: number = 1,
    direction: "incoming" | "outgoing" | "both" = "both",
  ): Promise<{
    nodes: DependencyNode[];
    edges: DependencyEdge[];
    truncated: boolean;
  }> {
    await this.verifyJobAccess(workspaceId, jobId);

    const matchedNodeIds = new Set<string>([nodeId]);
    const matchedEdgeIds = new Set<string>();
    let frontier = [nodeId],
      truncated = false;
    const allEdges: Array<{
      id: string;
      job_id: string;
      source_id: string;
      target_id: string;
      kind: DependencyEdge["kind"];
      resolution: DependencyEdge["resolution"];
      evidence: DependencyEdge["evidence"];
      weight: number;
    }> = [];
    for (
      let level = 0;
      level < Math.min(depth, 5) && frontier.length;
      level++
    ) {
      const result = await this.pool.query<(typeof allEdges)[number]>(
        "SELECT id,job_id,source_id,target_id,kind,resolution,evidence,weight FROM analysis_graph_edges WHERE job_id=$1 AND (($3 IN ('outgoing','both') AND source_id=ANY($2::text[])) OR ($3 IN ('incoming','both') AND target_id=ANY($2::text[]))) ORDER BY id LIMIT 401",
        [jobId, frontier, direction],
      );
      const next: string[] = [];
      if (result.rows.length > 400) truncated = true;
      for (const edge of result.rows) {
        if (matchedEdgeIds.has(edge.id)) continue;
        const unknown = [edge.source_id, edge.target_id].filter(
          (id) => !matchedNodeIds.has(id),
        );
        if (
          matchedNodeIds.size + unknown.length > 200 ||
          allEdges.length >= 400
        ) {
          truncated = true;
          continue;
        }
        for (const id of unknown) {
          matchedNodeIds.add(id);
          next.push(id);
        }
        matchedEdgeIds.add(edge.id);
        allEdges.push(edge);
      }
      frontier = next;
    }

    const nodeRes = await this.pool.query<{
      id: string;
      job_id: string;
      kind: DependencyNode["kind"];
      path: string;
      name: string;
      language?: string;
      lines_of_code?: number;
    }>(
      "SELECT id, job_id, kind, path, name, language, lines_of_code FROM analysis_graph_nodes WHERE job_id=$1 AND id = ANY($2::text[]) ORDER BY path ASC",
      [jobId, [...matchedNodeIds]],
    );

    const nodes: DependencyNode[] = nodeRes.rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      kind: r.kind,
      path: r.path,
      name: r.name,
      language: r.language ?? undefined,
      linesOfCode: r.lines_of_code ?? undefined,
    }));

    const edges: DependencyEdge[] = allEdges
      .filter((e) => matchedEdgeIds.has(e.id))
      .map((r) => ({
        id: r.id,
        jobId: r.job_id,
        sourceId: r.source_id,
        targetId: r.target_id,
        kind: r.kind,
        resolution: r.resolution,
        evidence: r.evidence,
        weight: r.weight,
      }))
      .sort((a, b) => a.id.localeCompare(b.id));

    return { nodes, edges, truncated };
  }

  async getCycles(
    workspaceId: string,
    jobId: string,
  ): Promise<{
    jobId: string;
    cycles: DependencyCycle[];
    totalCycles: number;
  }> {
    await this.verifyJobAccess(workspaceId, jobId);

    const res = await this.pool.query<{
      id: string;
      job_id: string;
      length: number;
      node_ids: string[];
      path: string[];
    }>(
      "SELECT id, job_id, length, node_ids, path FROM analysis_graph_cycles WHERE job_id=$1 ORDER BY id ASC LIMIT 200",
      [jobId],
    );

    const cycles: DependencyCycle[] = res.rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      length: r.length,
      nodeIds: r.node_ids,
      path: r.path,
    }));

    return {
      jobId,
      cycles,
      totalCycles: cycles.length,
    };
  }

  async getUnresolvedReferences(
    workspaceId: string,
    jobId: string,
  ): Promise<UnresolvedReferencesResponse> {
    await this.verifyJobAccess(workspaceId, jobId);

    const res = await this.pool.query<{
      id: string;
      source_file: string;
      source_symbol_name: string;
      local_alias?: string;
      module_specifier: string;
      status: ResolvedSymbolReference["status"];
      evidence: ResolvedSymbolReference["evidence"];
    }>(
      "SELECT id, source_file, source_symbol_name, local_alias, module_specifier, status, evidence FROM analysis_unresolved_references WHERE job_id=$1 ORDER BY source_file ASC LIMIT 200",
      [jobId],
    );

    const references: ResolvedSymbolReference[] = res.rows.map((r) => ({
      id: r.id,
      sourceFile: r.source_file,
      sourceSymbolName: r.source_symbol_name,
      localAlias: r.local_alias ?? undefined,
      moduleSpecifier: r.module_specifier,
      targetFile: null,
      targetSymbolId: null,
      status: r.status,
      evidence: r.evidence,
    }));

    return {
      jobId,
      references,
      totalCount: references.length,
    };
  }

  async getMetrics(
    workspaceId: string,
    jobId: string,
  ): Promise<{
    jobId: string;
    metrics: ModuleCouplingMetric[];
    totalModules: number;
  }> {
    await this.verifyJobAccess(workspaceId, jobId);

    const res = await this.pool.query<{
      job_id: string;
      path: string;
      afferent_coupling: number;
      efferent_coupling: number;
      instability: string;
      depth: number;
    }>(
      "SELECT job_id, path, afferent_coupling, efferent_coupling, instability, depth FROM analysis_graph_metrics WHERE job_id=$1 ORDER BY path ASC LIMIT 200",
      [jobId],
    );

    const metrics: ModuleCouplingMetric[] = res.rows.map((r) => ({
      jobId: r.job_id,
      path: r.path,
      afferentCoupling: r.afferent_coupling,
      efferentCoupling: r.efferent_coupling,
      instability: Number(r.instability),
      depth: r.depth,
    }));

    return {
      jobId,
      metrics,
      totalModules: metrics.length,
    };
  }
}
