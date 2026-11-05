import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  versionSnapshotSchema,
  sharedProjectionSchema,
  diagramTypeSchema,
} from "@codaryn/contracts";
import { renderDiagram } from "@codaryn/diagram-engine";
import { sanitizeExportContent } from "@codaryn/export-engine";
import { WorkspaceAccessError } from "@codaryn/database";
import { DiagramService } from "../diagrams/service.js";
import { TeamStore, auditTeam, requireCapability } from "./store.js";
const tokenHash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export class SharingService {
  constructor(
    readonly store: TeamStore,
    readonly diagrams: DiagramService,
  ) {}
  create(
    actor: string,
    workspace: string,
    kind: "version" | "diagram",
    resourceId: string,
    recipient: string,
    hours: number,
  ) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, permissions }) => {
        requireCapability(permissions.shareAnalysis);
        if (
          !(
            await client.query(
              "SELECT user_id FROM organization_members WHERE organization_id=$1 AND user_id=$2 FOR SHARE",
              [workspace, recipient],
            )
          ).rowCount
        )
          throw new WorkspaceAccessError();
        const resource = await client.query<{
          job_id: string;
          repository_id: string;
          snapshot: unknown;
          hash: string;
          diagram_type: string;
          name: string;
        }>(
          kind === "version"
            ? "SELECT job_id,repository_id,snapshot,hash,NULL AS diagram_type,NULL AS name FROM analysis_version_snapshots WHERE id=$1 AND organization_id=$2 AND status='completed'"
            : "SELECT job_id,repository_id,NULL AS snapshot,NULL AS hash,diagram_type,name FROM saved_diagram_layouts WHERE id=$1 AND organization_id=$2",
          [resourceId, workspace],
        );
        const row = resource.rows[0];
        if (!row) throw new WorkspaceAccessError();
        const access = await client.query<{
          generation: number;
          commit_sha: string;
        }>(
          "SELECT i.generation,j.commit_sha FROM analysis_jobs j JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id WHERE j.id=$1 AND j.organization_id=$2 AND r.id=$3 AND i.organization_id=$2 AND i.connected=true AND r.active=true AND j.status<>'cancelled' FOR SHARE OF j,r,i",
          [row.job_id, workspace, row.repository_id],
        );
        const source = access.rows[0];
        if (!source) throw new WorkspaceAccessError();
        let projection;
        if (kind === "version") {
          const version = versionSnapshotSchema.parse(row.snapshot);
          projection = {
            kind,
            jobId: row.job_id,
            commitSha: source.commit_sha,
            name: "Architecture version",
            hash: row.hash,
            nodes: version.files.slice(0, 200).map((file) => ({
              id: file.path,
              label: file.path.slice(0, 512),
              kind: "module",
            })),
            edges: version.edges
              .filter((edge) => edge.target)
              .slice(0, 500)
              .map((edge) => ({
                source: edge.source,
                target: edge.target ?? "",
                kind: edge.resolution,
              })),
            truncated: version.files.length > 200 || version.edges.length > 500,
          };
        } else {
          const snapshot = await this.diagrams.loadSnapshot(
              client,
              workspace,
              row.job_id,
            ),
            graph = renderDiagram(
              diagramTypeSchema.parse(row.diagram_type),
              snapshot,
            );
          projection = {
            kind,
            jobId: row.job_id,
            commitSha: source.commit_sha,
            name: row.name,
            hash: tokenHash(JSON.stringify(graph)),
            nodes: graph.nodes.slice(0, 200).map((node) => ({
              id: node.id,
              label: node.label,
              kind: node.kind,
            })),
            edges: graph.edges.slice(0, 500).map((edge) => ({
              source: edge.source,
              target: edge.target,
              kind: edge.kind,
            })),
            truncated: graph.nodes.length > 200 || graph.edges.length > 500,
          };
        }
        const visible = new Set(projection.nodes.map((node) => node.id)),
          linked = projection.edges.filter(
            (edge) => visible.has(edge.source) && visible.has(edge.target),
          );
        projection = {
          ...projection,
          edges: linked,
          truncated:
            projection.truncated || linked.length !== projection.edges.length,
        };
        const parsed: unknown = JSON.parse(
            sanitizeExportContent(JSON.stringify(projection)),
          ),
          safe = sharedProjectionSchema.parse(parsed),
          id = randomUUID(),
          token = randomBytes(32).toString("base64url"),
          expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
        await client.query(
          "INSERT INTO resource_shares(id,organization_id,repository_id,job_id,actor_id,recipient_id,resource_kind,resource_id,installation_generation,token_hash,projection,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
          [
            id,
            workspace,
            row.repository_id,
            row.job_id,
            actor,
            recipient,
            kind,
            resourceId,
            source.generation,
            tokenHash(token),
            safe,
            expiresAt,
          ],
        );
        await auditTeam(
          client,
          workspace,
          actor,
          "share.created",
          id,
          "share-created",
        );
        return { id, url: `/shared#${token}`, expiresAt };
      },
      true,
    );
  }
  async open(actor: string, token: string) {
    const rows = await this.store.pool.query<{ organization_id: string }>(
      "SELECT organization_id FROM resource_shares WHERE token_hash=$1 AND (recipient_id=$2 OR actor_id=$2)",
      [tokenHash(token), actor],
    );
    const workspace = rows.rows[0]?.organization_id;
    if (!workspace) throw new WorkspaceAccessError();
    return this.store.transaction(
      actor,
      workspace,
      async ({ client }) => {
        const result = await client.query<{ projection: unknown }>(
          "SELECT s.projection FROM resource_shares s JOIN organization_members a ON a.organization_id=s.organization_id AND a.user_id=s.actor_id JOIN organization_members b ON b.organization_id=s.organization_id AND b.user_id=s.recipient_id JOIN analysis_jobs j ON j.id=s.job_id AND j.organization_id=s.organization_id JOIN connected_repositories r ON r.id=s.repository_id AND j.repository_id=r.id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=s.organization_id LEFT JOIN workspace_controls c ON c.organization_id=s.organization_id WHERE s.token_hash=$1 AND s.organization_id=$2 AND (s.recipient_id=$3 OR s.actor_id=$3) AND s.revoked_at IS NULL AND s.expires_at>now() AND i.connected=true AND r.active=true AND i.generation=s.installation_generation AND j.status<>'cancelled' AND (a.role IN ('owner','admin') OR COALESCE(c.allow_member_sharing,false)) FOR SHARE OF s,a,b,j,r,i",
          [tokenHash(token), workspace, actor],
        );
        if (!result.rows[0]) throw new WorkspaceAccessError();
        await auditTeam(
          client,
          workspace,
          actor,
          "share.opened",
          "shared-view",
          "share-opened",
        );
        return sharedProjectionSchema.parse(result.rows[0].projection);
      },
      true,
    );
  }
  revoke(actor: string, workspace: string, id: string) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, permissions }) => {
        if (
          !(
            await client.query(
              "UPDATE resource_shares SET revoked_at=now() WHERE id=$1 AND organization_id=$2 AND (actor_id=$3 OR $4) RETURNING id",
              [id, workspace, actor, permissions.manageWorkspace],
            )
          ).rowCount
        )
          throw new WorkspaceAccessError();
        await auditTeam(client, workspace, actor, "share.revoked", id);
        return { revoked: true };
      },
      true,
    );
  }
  list(actor: string, workspace: string, page: number) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, permissions }) => {
        const result = await client.query(
          "SELECT id,resource_kind,resource_id,recipient_id,actor_id,expires_at,revoked_at FROM resource_shares WHERE organization_id=$1 AND (actor_id=$2 OR recipient_id=$2 OR $3) ORDER BY created_at DESC,id LIMIT 50 OFFSET $4",
          [workspace, actor, permissions.manageWorkspace, (page - 1) * 50],
        );
        return { items: result.rows, page, pageSize: 50 };
      },
    );
  }
}
