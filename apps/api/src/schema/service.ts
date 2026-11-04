import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  schemaSnapshotSchema,
  schemaSnapshotSummarySchema,
  type SchemaSnapshot,
  type SchemaSnapshotSummary,
} from "@codaryn/contracts";
import { WorkspaceAccessError } from "@codaryn/database";
import {
  compareSchemas,
  renderSchemaMarkdown,
  renderSchemaSvg,
} from "@codaryn/schema-engine";
import { RequestFailure } from "../http/access.js";
interface SnapshotRow {
  id: string;
  job_id: string;
  commit_sha: string;
  status: string;
  hash: string | null;
  table_count: number;
  failure_code: string | null;
  created_at: Date;
  snapshot: unknown;
}
const summary = (row: Omit<SnapshotRow, "snapshot">): SchemaSnapshotSummary =>
  schemaSnapshotSummarySchema.parse({
    id: row.id,
    jobId: row.job_id,
    commitSha: row.commit_sha,
    status: row.status,
    hash: row.hash,
    tableCount: row.table_count,
    failureCode: row.failure_code,
    createdAt: row.created_at.toISOString(),
  });
export class SchemaService {
  constructor(private readonly pool: Pool) {}
  private async workspace<T>(
    actor: string,
    workspace: string,
    operation: (client: PoolClient) => Promise<T>,
    write = false,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (write)
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [`schema:${workspace}`],
        );
      const membership = await client.query(
        "SELECT m.role FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND o.id=$2 AND o.deleted_at IS NULL FOR SHARE OF m,o",
        [actor, workspace],
      );
      if (!membership.rowCount) throw new WorkspaceAccessError();
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
  private async load(client: PoolClient, workspace: string, id: string) {
    const result = await client.query<SnapshotRow>(
      "SELECT * FROM analysis_schema_snapshots WHERE id=$1 AND organization_id=$2",
      [id, workspace],
    );
    const row = result.rows[0];
    if (!row) throw new WorkspaceAccessError();
    return row;
  }
  private ready(row: SnapshotRow): SchemaSnapshot {
    if (row.status !== "completed")
      throw new RequestFailure(
        409,
        "SCHEMA_NOT_READY",
        "Wait for schema extraction to complete",
      );
    return schemaSnapshotSchema.parse(row.snapshot);
  }
  request(
    actor: string,
    workspace: string,
    jobId: string,
    inferRelations: boolean,
  ) {
    return this.workspace(
      actor,
      workspace,
      async (client) => {
        const recent = await client.query<{ count: string }>(
          "SELECT count(*) FROM analysis_schema_snapshots WHERE organization_id=$1 AND created_at>now()-interval '1 minute'",
          [workspace],
        );
        if (Number(recent.rows[0].count) >= 5)
          throw new RequestFailure(
            429,
            "SCHEMA_LIMIT",
            "Wait before requesting more schema snapshots",
          );
        const job = await client.query<{
          repository_id: string;
          commit_sha: string;
          generation: number;
        }>(
          "SELECT j.repository_id,j.commit_sha,i.generation FROM analysis_jobs j JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id WHERE j.id=$1 AND j.organization_id=$2 AND i.organization_id=$2 AND j.status<>'cancelled' AND r.active=true AND i.connected=true FOR SHARE OF j,r,i",
          [jobId, workspace],
        );
        const selected = job.rows[0];
        if (!selected) throw new WorkspaceAccessError();
        const id = randomUUID();
        const inserted = await client.query<SnapshotRow>(
          "INSERT INTO analysis_schema_snapshots (id,job_id,organization_id,repository_id,actor_id,commit_sha,installation_generation,infer_relations) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
          [
            id,
            jobId,
            workspace,
            selected.repository_id,
            actor,
            selected.commit_sha,
            selected.generation,
            inferRelations,
          ],
        );
        await client.query(
          "INSERT INTO audit_events (id,organization_id,actor_id,action,target_id) VALUES ($1,$2,$3,'schema.snapshot.requested',$4)",
          [randomUUID(), workspace, actor, id],
        );
        return summary(inserted.rows[0]);
      },
      true,
    );
  }
  list(actor: string, workspace: string, page: number, jobId?: string) {
    return this.workspace(actor, workspace, async (client) => {
      const result = await client.query<SnapshotRow>(
        "SELECT id,job_id,commit_sha,status,hash,table_count,failure_code,created_at FROM analysis_schema_snapshots WHERE organization_id=$1 AND ($2::uuid IS NULL OR job_id=$2) ORDER BY created_at DESC,id LIMIT 20 OFFSET $3",
        [workspace, jobId ?? null, (page - 1) * 20],
      );
      return { snapshots: result.rows.map(summary), page, pageSize: 20 };
    });
  }
  overview(actor: string, workspace: string, id: string) {
    return this.workspace(actor, workspace, async (client) => {
      const row = await this.load(client, workspace, id);
      const snapshot = row.status === "completed" ? this.ready(row) : null;
      return {
        snapshot: summary(row),
        tables: snapshot?.tables.length ?? 0,
        columns:
          snapshot?.tables.reduce(
            (sum, item) => sum + item.columns.length,
            0,
          ) ?? 0,
        relations: snapshot?.relations.length ?? 0,
        enums: snapshot?.enums.slice(0, 20) ?? [],
        enumCount: snapshot?.enums.length ?? 0,
        diagnostics: snapshot?.diagnostics.slice(0, 50) ?? [],
        diagnosticCount: snapshot?.diagnostics.length ?? 0,
      };
    });
  }
  objects(
    actor: string,
    workspace: string,
    id: string,
    query: {
      kind:
        | "tables"
        | "relations"
        | "lineage"
        | "columns"
        | "constraints"
        | "enums";
      page: number;
      search: string;
      adapter: string;
      tableId?: string;
    },
  ) {
    const { kind, page, search, adapter, tableId } = query;
    return this.workspace(actor, workspace, async (client) => {
      const snapshot = this.ready(await this.load(client, workspace, id));
      const eligible = new Set(
        snapshot.tables
          .filter((item) => !adapter || item.adapter === adapter)
          .map((item) => item.id),
      );
      let items: unknown[] = [];
      if (kind === "tables")
        items = snapshot.tables
          .filter(
            (item) =>
              eligible.has(item.id) &&
              (!search ||
                `${item.name} ${item.domain} ${item.modelName}`
                  .toLowerCase()
                  .includes(search.toLowerCase())),
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            namespace: item.namespace,
            adapter: item.adapter,
            domain: item.domain,
            joinTable: item.joinTable,
            columnCount: item.columns.length,
            evidence: item.evidence,
          }));
      else if (kind === "enums")
        items = snapshot.enums.filter(
          (item) =>
            (!adapter || item.adapter === adapter) &&
            (!search || item.name.toLowerCase().includes(search.toLowerCase())),
        );
      else if (kind === "columns" || kind === "constraints")
        items = snapshot.tables
          .filter(
            (item) =>
              eligible.has(item.id) && (!tableId || item.id === tableId),
          )
          .flatMap((item) => {
            const members =
              kind === "columns" ? item.columns : item.constraints;
            return members
              .filter(
                (member) =>
                  !search ||
                  member.name.toLowerCase().includes(search.toLowerCase()),
              )
              .map((member) => ({ ...member, tableId: item.id }));
          });
      else if (kind === "relations")
        items = snapshot.relations.filter(
          (item) =>
            eligible.has(item.sourceTableId) &&
            (!tableId ||
              item.sourceTableId === tableId ||
              item.targetTableId === tableId) &&
            (!search || item.name.toLowerCase().includes(search.toLowerCase())),
        );
      else
        items = snapshot.lineage.filter(
          (item) =>
            eligible.has(item.tableId) &&
            (!tableId || item.tableId === tableId) &&
            (!search || item.name.toLowerCase().includes(search.toLowerCase())),
        );
      return {
        items: items.slice((page - 1) * 50, page * 50),
        total: items.length,
        page,
        pageSize: 50,
      };
    });
  }
  table(
    actor: string,
    workspace: string,
    id: string,
    tableId: string,
    columnId?: string,
  ) {
    return this.workspace(actor, workspace, async (client) => {
      const snapshot = this.ready(await this.load(client, workspace, id));
      const table = snapshot.tables.find((item) => item.id === tableId);
      if (!table) throw new WorkspaceAccessError();
      if (columnId) {
        const column = table.columns.find((item) => item.id === columnId);
        if (!column) throw new WorkspaceAccessError();
        return { column, tableId: table.id };
      }
      return {
        table,
        relations: snapshot.relations.filter(
          (item) =>
            item.sourceTableId === table.id || item.targetTableId === table.id,
        ),
        lineage: snapshot.lineage.filter((item) => item.tableId === table.id),
        gaps: [
          "Frontend/API/DTO/service connections are unresolved unless explicitly listed with evidence.",
        ],
      };
    });
  }
  diagram(
    actor: string,
    workspace: string,
    id: string,
    search: string,
    adapter: string,
  ) {
    return this.workspace(actor, workspace, async (client) => {
      const snapshot = this.ready(await this.load(client, workspace, id));
      const matching = snapshot.tables.filter(
        (item) =>
          (!adapter || item.adapter === adapter) &&
          (!search ||
            `${item.name} ${item.domain}`
              .toLowerCase()
              .includes(search.toLowerCase())),
      );
      const tables = matching.slice(0, 100).map((item) => ({
        ...item,
        columns: item.columns.slice(0, 11),
        constraints: [],
        source: "",
      }));
      const visible = new Set(tables.map((item) => item.id));
      return {
        tables,
        relations: snapshot.relations.filter(
          (item) =>
            visible.has(item.sourceTableId) &&
            visible.has(item.targetTableId ?? ""),
        ),
        truncated: matching.length > 100,
      };
    });
  }
  compare(actor: string, workspace: string, id: string, other: string) {
    return this.workspace(actor, workspace, async (client) => {
      const before = this.ready(await this.load(client, workspace, id));
      const after = this.ready(await this.load(client, workspace, other));
      const comparison = compareSchemas(before, after, id, other);
      if (comparison.changes.length > 20000)
        throw new RequestFailure(
          413,
          "COMPARISON_LIMIT",
          "Comparison exceeds the safe result limit; export JSON snapshots for offline comparison",
        );
      return comparison;
    });
  }
  export(
    actor: string,
    workspace: string,
    id: string,
    format: "json" | "svg" | "markdown",
    layout: "er" | "compact",
  ) {
    return this.workspace(actor, workspace, async (client) => {
      const row = await this.load(client, workspace, id);
      const snapshot = this.ready(row);
      if (!row.hash) throw new Error("Completed snapshot has no content hash");
      if (format === "json")
        return {
          content: JSON.stringify(
            { id: row.id, commitSha: row.commit_sha, hash: row.hash, snapshot },
            null,
            2,
          ),
          contentType: "application/json",
          extension: "json",
        };
      if (format === "svg" && snapshot.tables.length > 100)
        throw new RequestFailure(
          400,
          "EXPORT_LIMIT",
          "SVG supports up to 100 tables; export JSON or Markdown for larger schemas",
        );
      return format === "svg"
        ? {
            content: renderSchemaSvg(snapshot, id, row.hash, layout),
            contentType: "image/svg+xml",
            extension: "svg",
          }
        : {
            content: renderSchemaMarkdown(snapshot, id, row.hash),
            contentType: "text/markdown",
            extension: "md",
          };
    });
  }
}
