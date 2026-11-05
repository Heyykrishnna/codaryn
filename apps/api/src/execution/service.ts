import {
  ArtifactSnapshots,
  type ArtifactRow as SnapshotRow,
} from "../artifacts/snapshots.js";
import type { Pool, PoolClient } from "pg";
import {
  executionSnapshotSchema,
  executionSnapshotSummarySchema,
  type ExecutionSnapshot,
  type ExecutionSnapshotSummary,
} from "@codaryn/contracts";
import { WorkspaceAccessError } from "@codaryn/database";
import {
  executionPaths,
  executionNeighborhood,
} from "@codaryn/execution-analyzer";
import { RequestFailure } from "../http/access.js";
const summary = (
  row: Omit<SnapshotRow, "snapshot">,
): ExecutionSnapshotSummary =>
  executionSnapshotSummarySchema.parse({
    id: row.id,
    jobId: row.job_id,
    commitSha: row.commit_sha,
    status: row.status,
    hash: row.hash,
    functionCount: row.object_count,
    failureCode: row.failure_code,
    createdAt: row.created_at.toISOString(),
  });
export class ExecutionService {
  private readonly store: ArtifactSnapshots;
  constructor(pool: Pool) {
    this.store = new ArtifactSnapshots(pool, "execution");
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
  private ready(row: SnapshotRow): ExecutionSnapshot {
    if (row.status !== "completed")
      throw new RequestFailure(
        409,
        "EXECUTION_NOT_READY",
        "Wait for execution extraction to complete",
      );
    return executionSnapshotSchema.parse(row.snapshot);
  }
  async request(actor: string, workspace: string, jobId: string) {
    return summary(await this.store.request(actor, workspace, jobId));
  }
  async list(actor: string, workspace: string, page: number, jobId?: string) {
    const rows = await this.store.list(actor, workspace, page, jobId);
    return { snapshots: rows.map(summary), page, pageSize: 20 };
  }
  jobs(actor: string, workspace: string) {
    return this.store.jobs(actor, workspace);
  }
  overview(actor: string, workspace: string, id: string) {
    return this.workspace(actor, workspace, async (client) => {
      const row = await this.load(client, workspace, id);
      const data = row.status === "completed" ? this.ready(row) : null;
      return {
        snapshot: summary(row),
        semantics: "potential-static",
        functions: data?.functions.length ?? 0,
        calls: data?.calls.length ?? 0,
        unresolved: data?.calls.filter((c) => c.targetId === null).length ?? 0,
        entries: data?.entries.length ?? 0,
        diagnostics: data?.diagnostics.slice(0, 30) ?? [],
        diagnosticCount: data?.diagnostics.length ?? 0,
      };
    });
  }
  objects(
    actor: string,
    workspace: string,
    id: string,
    query: {
      kind: "functions" | "calls" | "entries" | "unresolved";
      page: number;
      search: string;
    },
  ) {
    return this.workspace(actor, workspace, async (client) => {
      const data = this.ready(await this.load(client, workspace, id));
      let items: unknown[];
      if (query.kind === "functions")
        items = data.functions.filter(
          (f) =>
            !query.search ||
            `${f.name} ${f.evidence.path}`
              .toLowerCase()
              .includes(query.search.toLowerCase()),
        );
      else if (query.kind === "entries")
        items = data.entries.filter(
          (e) =>
            !query.search ||
            e.label.toLowerCase().includes(query.search.toLowerCase()),
        );
      else
        items = data.calls.filter(
          (c) =>
            (query.kind !== "unresolved" || c.targetId === null) &&
            (!query.search ||
              c.expression.toLowerCase().includes(query.search.toLowerCase())),
        );
      return {
        items: items.slice((query.page - 1) * 50, query.page * 50),
        total: items.length,
        page: query.page,
        pageSize: 50,
      };
    });
  }
  inspect(actor: string, workspace: string, id: string, functionId: string) {
    return this.workspace(actor, workspace, async (client) => {
      const data = this.ready(await this.load(client, workspace, id));
      const fn = data.functions.find((f) => f.id === functionId);
      if (!fn) throw new WorkspaceAccessError();
      const calls = data.calls.filter(
        (c) => c.sourceId === functionId || c.targetId === functionId,
      );
      const nodes = data.controlNodes.filter(
        (n) => n.functionId === functionId,
      );
      const edges = data.controlEdges.filter(
        (e) => e.functionId === functionId,
      );
      const values = data.values.filter((v) => v.functionId === functionId);
      const flows = data.flows.filter((f) => f.functionId === functionId);
      return {
        function: fn,
        calls: calls.slice(0, 500),
        controlNodes: nodes.slice(0, 2000),
        controlEdges: edges.slice(0, 4000),
        values: values.slice(0, 1000),
        flows: flows.slice(0, 2000),
        truncated:
          calls.length > 500 ||
          nodes.length > 2000 ||
          edges.length > 4000 ||
          values.length > 1000 ||
          flows.length > 2000,
        semantics: data.semantics,
      };
    });
  }
  traverse(
    actor: string,
    workspace: string,
    id: string,
    query: { from: string; to?: string; depth: number },
  ) {
    return this.workspace(actor, workspace, async (client) => {
      const data = this.ready(await this.load(client, workspace, id));
      if (
        !data.functions.some((f) => f.id === query.from) ||
        (query.to && !data.functions.some((f) => f.id === query.to))
      )
        throw new WorkspaceAccessError();
      if (query.to) {
        const result = executionPaths(data, query.from, query.to, query.depth);
        const ids = new Set(result.paths.flat());
        return {
          ...result,
          functions: data.functions.filter((fn) => ids.has(fn.id)),
        };
      }
      return executionNeighborhood(data, query.from, query.depth);
    });
  }
}
