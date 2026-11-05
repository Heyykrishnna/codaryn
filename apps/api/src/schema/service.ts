import {
  ArtifactSnapshots,
  type ArtifactRow as SnapshotRow,
} from "../artifacts/snapshots.js";
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
const summary = (row: Omit<SnapshotRow, "snapshot">): SchemaSnapshotSummary =>
  schemaSnapshotSummarySchema.parse({
    id: row.id,
    jobId: row.job_id,
    commitSha: row.commit_sha,
    status: row.status,
    hash: row.hash,
    tableCount: row.object_count,
    failureCode: row.failure_code,
    createdAt: row.created_at.toISOString(),
  });
export class SchemaService {
  private readonly store: ArtifactSnapshots;
  constructor(pool: Pool) {
    this.store = new ArtifactSnapshots(pool, "schema");
  }
  private workspace<T>(
    actor: string,
    workspace: string,
    operation: (client: PoolClient) => Promise<T>,
    write = false,
  ) {
    return this.store.workspace(actor, workspace, operation, write);
  }
  private load(client: PoolClient, workspace: string, id: string) {
    return this.store.load(client, workspace, id);
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
  async request(
    actor: string,
    workspace: string,
    jobId: string,
    inferRelations: boolean,
  ) {
    return summary(
      await this.store.request(actor, workspace, jobId, inferRelations),
    );
  }
  async list(actor: string, workspace: string, page: number, jobId?: string) {
    const rows = await this.store.list(actor, workspace, page, jobId);
    return { snapshots: rows.map(summary), page, pageSize: 20 };
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
