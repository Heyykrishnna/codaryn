import {
  schemaSnapshotSchema,
  executionSnapshotSchema,
  sourceEvidenceSchema,
  type DependencyEdge,
} from "@codaryn/contracts";
import { buildAtlas } from "./atlas.js";
import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  type DiagramGraph,
  type DiagramLayoutConfig,
  type DiagramType,
  type DocumentSearchQuery,
  type DocumentSearchResult,
  type DocumentTemplateId,
  type GeneratedDocument,
  type SavedDiagramLayout,
  diagramLayoutConfigSchema,
  savedDiagramLayoutSchema,
  generatedDocumentSchema,
} from "@codaryn/contracts";
import {
  renderDiagram,
  type AnalysisSnapshotInput,
} from "@codaryn/diagram-engine";
import {
  generateAllDocuments,
  generateDocument,
  searchDocuments,
} from "@codaryn/documentation-engine";
import { WorkspaceAccessError } from "@codaryn/database";
import { RequestFailure } from "../http/access.js";

export class DiagramService {
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
          [`diagrams:${workspaceId}`],
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

  async loadSnapshot(
    client: PoolClient,
    workspaceId: string,
    jobId: string,
    forAtlas = false,
  ): Promise<AnalysisSnapshotInput> {
    const jobResult = await client.query<{
      id: string;
      commit_sha: string;
      full_name: string;
      status: string;
    }>(
      "SELECT j.id,j.commit_sha,r.full_name,j.status FROM analysis_jobs j JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=j.organization_id WHERE j.id=$1 AND j.organization_id=$2 AND r.active=true AND i.connected=true FOR SHARE OF j,r,i",
      [jobId, workspaceId],
    );

    const job = jobResult.rows[0];
    if (!job) {
      throw new RequestFailure(
        404,
        "JOB_NOT_FOUND",
        "Analysis job not found in workspace",
      );
    }
    if (job.status === "cancelled") {
      throw new RequestFailure(
        409,
        "JOB_CANCELLED",
        "Analysis job was cancelled",
      );
    }

    if (forAtlas && job.status !== "completed") {
      throw new RequestFailure(
        409,
        "ANALYSIS_INCOMPLETE",
        "Architecture is available after analysis completes.",
      );
    }

    const snapshot: AnalysisSnapshotInput = {
      jobId: job.id,
      commitSha: job.commit_sha,
      repositoryName: job.full_name,
    };

    const schemaRes = await client.query<{ snapshot: unknown }>(
      "SELECT snapshot FROM analysis_schema_snapshots WHERE job_id=$1 AND organization_id=$2 AND status='completed' ORDER BY created_at DESC LIMIT 1",
      [jobId, workspaceId],
    );
    if (schemaRes.rows[0]?.snapshot) {
      const raw = schemaSnapshotSchema.parse(schemaRes.rows[0].snapshot),
        names = new Map(
          raw.tables.map((table) => [
            table.id,
            `${table.namespace}.${table.name}`,
          ]),
        );
      snapshot.schema = {
        tables: raw.tables.map((table) => ({
          name: names.get(table.id) ?? table.name,
          filePath: table.evidence.path,
          startLine: table.evidence.startLine,
          endLine: table.evidence.endLine,
          columns: table.columns.map((column) => ({
            name: column.name,
            dataType: column.type,
            isPrimaryKey: column.primaryKey,
            isNullable: column.nullable,
          })),
        })),
        relations: raw.relations.map((edge) => ({
          id: edge.id,
          sourceTable: names.get(edge.sourceTableId) ?? "unresolved",
          sourceColumn: edge.columns[0] ?? "",
          targetTable: names.get(edge.targetTableId ?? "") ?? "unresolved",
          targetColumn: edge.targetColumns[0] ?? "",
          cardinality:
            edge.cardinality === "one-to-one"
              ? "one_to_one"
              : edge.cardinality === "many-to-many"
                ? "many_to_many"
                : "one_to_many",
          status: edge.resolution,
          evidence: edge.evidence,
        })),
      };
    }

    const execRes = await client.query<{ snapshot: unknown }>(
      "SELECT snapshot FROM analysis_execution_snapshots WHERE job_id=$1 AND organization_id=$2 AND status='completed' ORDER BY created_at DESC LIMIT 1",
      [jobId, workspaceId],
    );
    if (execRes.rows[0]?.snapshot) {
      const raw = executionSnapshotSchema.parse(execRes.rows[0].snapshot);
      snapshot.execution = {
        ...(forAtlas
          ? { controlNodes: raw.controlNodes, controlEdges: raw.controlEdges }
          : {}),
        functions: raw.functions.map((fn) => ({
          id: fn.id,
          name: fn.name,
          filePath: fn.evidence.path,
          startLine: fn.evidence.startLine,
          endLine: fn.evidence.endLine,
        })),
        calls: raw.calls.flatMap((call) =>
          call.targetId
            ? [
                {
                  id: call.id,
                  callerId: call.sourceId,
                  calleeId: call.targetId,
                  status: call.resolution,
                  evidence: call.evidence,
                },
              ]
            : [],
        ),
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
      "SELECT id,name,path AS file_path,COALESCE((source_evidence->>'startLine')::int,1) AS start_line,COALESCE((source_evidence->>'endLine')::int,1) AS end_line,(kind='page') AS is_page FROM analysis_frontend_components WHERE job_id=$1 LIMIT 10000",
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

    if (forAtlas && snapshot.frontend) {
      const connections = await client.query<{
        source_component_id: string;
        target_component_id: string;
        source_evidence: unknown;
      }>(
        "SELECT source_component_id,target_component_id,source_evidence FROM analysis_frontend_jsx_elements WHERE job_id=$1 AND target_component_id IS NOT NULL ORDER BY id LIMIT 20000",
        [jobId],
      );
      snapshot.frontend.connections = connections.rows.map((row) => ({
        sourceId: row.source_component_id,
        targetId: row.target_component_id,
        kind: "renders",
        status: "RESOLVED",
        evidence: sourceEvidenceSchema.safeParse(row.source_evidence).data,
      }));
    }

    const beRoutes = await client.query<{
      id: string;
      method: string;
      path: string;
      file_path: string;
      handler_name: string;
      middleware: string[];
      start_line: number;
      end_line: number;
    }>(
      "SELECT id,method,path,file_path,handler_name,middleware,COALESCE((source_evidence->>'startLine')::int,1) AS start_line,COALESCE((source_evidence->>'endLine')::int,1) AS end_line FROM analysis_backend_routes WHERE job_id=$1 ORDER BY path,id LIMIT 10000",
      [jobId],
    );
    if (beRoutes.rowCount && beRoutes.rowCount > 0) {
      snapshot.backend = {
        routes: beRoutes.rows.map((r) => ({
          id: r.id,
          method: r.method,
          handler: r.handler_name,
          middleware: r.middleware,
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
      kind: string;
    }>(
      "SELECT id,path,name,kind FROM analysis_graph_nodes WHERE job_id=$1 ORDER BY path,id LIMIT 10000",
      [jobId],
    );
    if (depNodes.rowCount && depNodes.rowCount > 0) {
      const dependencyEdges = await client.query<{
        source_id: string;
        target_id: string;
        kind: string;
        resolution: DependencyEdge["resolution"];
        evidence: DependencyEdge["evidence"];
        weight: number;
      }>(
        `SELECT source_id,target_id,kind,resolution,evidence,weight FROM analysis_graph_edges
         WHERE job_id=$1 AND source_id=ANY($2::text[]) AND target_id=ANY($2::text[])
         ORDER BY id LIMIT 20000`,
        [jobId, depNodes.rows.map((node) => node.id)],
      );
      snapshot.dependencies = {
        nodes: depNodes.rows.map((row) => ({
          id: row.id,
          path: row.path,
          name: row.name,
          isExternal: row.kind === "external",
        })),
        edges: dependencyEdges.rows.map((row) => ({
          sourceId: row.source_id,
          targetId: row.target_id,
          kind: row.kind,
          status: row.resolution,
          weight: Math.min(row.weight, 1000),
          evidence: sourceEvidenceSchema.safeParse(row.evidence[0]).data,
        })),
      };
    }

    return snapshot;
  }

  getAtlas(actor: string, workspaceId: string, jobId: string) {
    return this.workspace(actor, workspaceId, async (client) => {
      const snapshot = await this.loadSnapshot(
        client,
        workspaceId,
        jobId,
        true,
      );
      const { rows } = await client.query<{
        files: number;
        symbols: number;
        diagnostics: number;
        cycles: number;
        unresolved: number;
      }>(
        `SELECT file_count AS files,symbol_count AS symbols,diagnostic_count AS diagnostics,
           (SELECT count(*)::int FROM analysis_graph_cycles WHERE job_id=$1) AS cycles,
           (SELECT count(*)::int FROM analysis_unresolved_references WHERE job_id=$1 AND status='unresolved') AS unresolved
         FROM analysis_jobs WHERE id=$1`,
        [jobId],
      );
      return buildAtlas(snapshot, rows[0]);
    });
  }

  async getDiagram(
    actor: string,
    workspaceId: string,
    jobId: string,
    type: DiagramType,
  ): Promise<DiagramGraph> {
    return this.workspace(actor, workspaceId, async (client) => {
      const snapshot = await this.loadSnapshot(client, workspaceId, jobId);
      return renderDiagram(type, snapshot);
    });
  }

  async saveLayout(
    actor: string,
    workspaceId: string,
    jobId: string,
    type: DiagramType,
    name: string,
    rawLayoutConfig: unknown,
  ): Promise<SavedDiagramLayout> {
    const layoutConfig = diagramLayoutConfigSchema.parse(rawLayoutConfig);

    return this.workspace(
      actor,
      workspaceId,
      async (client) => {
        const repoRes = await client.query<{ repository_id: string }>(
          "SELECT repository_id FROM analysis_jobs WHERE id=$1 AND organization_id=$2",
          [jobId, workspaceId],
        );
        const repo = repoRes.rows[0];
        if (!repo) {
          throw new RequestFailure(
            404,
            "JOB_NOT_FOUND",
            "Analysis job not found",
          );
        }

        const id = randomUUID();
        const now = new Date().toISOString();

        await client.query(
          "INSERT INTO saved_diagram_layouts (id,organization_id,repository_id,job_id,diagram_type,name,layout_config,actor_id,created_at,updated_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)",
          [
            id,
            workspaceId,
            repo.repository_id,
            jobId,
            type,
            name,
            JSON.stringify(layoutConfig),
            actor,
            now,
          ],
        );

        await client.query(
          "INSERT INTO audit_events(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'team.view.saved',$4)",
          [randomUUID(), workspaceId, actor, id],
        );
        return savedDiagramLayoutSchema.parse({
          id,
          diagramType: type,
          name,
          layoutConfig,
          createdAt: now,
          updatedAt: now,
          actorId: actor,
        });
      },
      true,
    );
  }

  async listLayouts(
    actor: string,
    workspaceId: string,
    jobId: string,
    type: DiagramType,
  ): Promise<{ layouts: SavedDiagramLayout[] }> {
    return this.workspace(actor, workspaceId, async (client) => {
      const result = await client.query<{
        id: string;
        diagram_type: DiagramType;
        name: string;
        layout_config: DiagramLayoutConfig;
        created_at: Date;
        updated_at: Date;
        actor_id: string;
      }>(
        "SELECT id,diagram_type,name,layout_config,created_at,updated_at,actor_id FROM saved_diagram_layouts WHERE organization_id=$1 AND job_id=$2 AND diagram_type=$3 ORDER BY updated_at DESC",
        [workspaceId, jobId, type],
      );

      const layouts = result.rows.map((row) =>
        savedDiagramLayoutSchema.parse({
          id: row.id,
          diagramType: row.diagram_type,
          name: row.name,
          layoutConfig: row.layout_config,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          actorId: row.actor_id,
        }),
      );

      return { layouts };
    });
  }

  async getLayout(
    actor: string,
    workspaceId: string,
    jobId: string,
    layoutId: string,
  ): Promise<SavedDiagramLayout> {
    return this.workspace(actor, workspaceId, async (client) => {
      const result = await client.query<{
        id: string;
        diagram_type: DiagramType;
        name: string;
        layout_config: DiagramLayoutConfig;
        created_at: Date;
        updated_at: Date;
        actor_id: string;
      }>(
        "SELECT id,diagram_type,name,layout_config,created_at,updated_at,actor_id FROM saved_diagram_layouts WHERE id=$1 AND organization_id=$2 AND job_id=$3",
        [layoutId, workspaceId, jobId],
      );

      const row = result.rows[0];
      if (!row) {
        throw new RequestFailure(
          404,
          "LAYOUT_NOT_FOUND",
          "Saved layout not found",
        );
      }

      return savedDiagramLayoutSchema.parse({
        id: row.id,
        diagramType: row.diagram_type,
        name: row.name,
        layoutConfig: row.layout_config,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
        actorId: row.actor_id,
      });
    });
  }

  async getDocument(
    actor: string,
    workspaceId: string,
    jobId: string,
    templateId: DocumentTemplateId,
  ): Promise<GeneratedDocument> {
    return this.workspace(
      actor,
      workspaceId,
      async (client) => {
        const cached = await client.query<{
          id: string;
          template_id: DocumentTemplateId;
          title: string;
          version: number;
          content_markdown: string;
          metadata: unknown;
          created_at: Date;
        }>(
          "SELECT id,template_id,title,version,content_markdown,metadata,created_at FROM analysis_generated_documents WHERE organization_id=$1 AND job_id=$2 AND template_id=$3",
          [workspaceId, jobId, templateId],
        );

        if (cached.rows[0]) {
          const row = cached.rows[0];
          const snapshot = await this.loadSnapshot(client, workspaceId, jobId);
          const generated = generateDocument(templateId, snapshot);
          return generatedDocumentSchema.parse({
            id: row.id,
            templateId: row.template_id,
            title: row.title,
            version: row.version,
            jobId,
            commitSha: snapshot.commitSha,
            sections: generated.sections,
            markdown: row.content_markdown,
            metadata: row.metadata,
          });
        }

        const snapshot = await this.loadSnapshot(client, workspaceId, jobId);
        const generated = generateDocument(templateId, snapshot);

        const repoRes = await client.query<{ repository_id: string }>(
          "SELECT repository_id FROM analysis_jobs WHERE id=$1 AND organization_id=$2",
          [jobId, workspaceId],
        );
        const repo = repoRes.rows[0];
        if (repo) {
          await client.query(
            "INSERT INTO analysis_generated_documents (id,organization_id,repository_id,job_id,template_id,title,version,content_markdown,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING",
            [
              generated.id,
              workspaceId,
              repo.repository_id,
              jobId,
              templateId,
              generated.title,
              generated.version,
              generated.markdown,
              JSON.stringify(generated.metadata),
            ],
          );
        }

        return generated;
      },
      true,
    );
  }

  async listDocuments(
    actor: string,
    workspaceId: string,
    jobId: string,
  ): Promise<{
    documents: Array<{
      templateId: DocumentTemplateId;
      title: string;
      version: number;
      wordCount: number;
      evidenceCount: number;
    }>;
  }> {
    return this.workspace(actor, workspaceId, async (client) => {
      const snapshot = await this.loadSnapshot(client, workspaceId, jobId);
      const all = generateAllDocuments(snapshot);
      return {
        documents: all.map((item) => ({
          templateId: item.templateId,
          title: item.title,
          version: item.version,
          wordCount: item.metadata.wordCount,
          evidenceCount: item.metadata.evidenceCount,
        })),
      };
    });
  }

  async searchDocumentation(
    actor: string,
    workspaceId: string,
    jobId: string,
    searchQuery: DocumentSearchQuery,
  ): Promise<{ results: DocumentSearchResult[] }> {
    return this.workspace(actor, workspaceId, async (client) => {
      const snapshot = await this.loadSnapshot(client, workspaceId, jobId);
      const all = generateAllDocuments(snapshot);
      const results = searchDocuments(all, searchQuery);
      return { results };
    });
  }
}
