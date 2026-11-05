import {
  createHmac,
  createHash,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";
import { WorkspaceAccessError } from "@codaryn/database";
import type { PoolClient } from "pg";
import { TeamStore, auditTeam, requireCapability } from "./store.js";
export function signDownload(
  secret: string,
  id: string,
  actor: string,
  exportId: string,
  hash: string,
  expires: string,
) {
  return createHmac("sha256", secret)
    .update(
      JSON.stringify(["codaryn-export-v1", id, actor, exportId, hash, expires]),
    )
    .digest("hex");
}
export class DownloadService {
  constructor(
    readonly store: TeamStore,
    readonly secret: string,
  ) {
    if (secret.length < 32)
      throw new Error("A signing secret of at least 32 characters is required");
  }
  private async artifact(client: PoolClient, workspace: string, id: string) {
    const row = (
      await client.query<{
        id: string;
        content_type: string;
        filename: string;
        payload: string;
        size: number;
        hash: string;
      }>(
        "SELECT a.id,a.content_type,a.filename,a.payload,a.size,a.hash FROM export_artifacts a JOIN export_jobs e ON e.id=a.export_job_id AND e.organization_id=a.organization_id JOIN analysis_jobs j ON j.id=e.job_id AND j.organization_id=e.organization_id AND j.repository_id=e.repository_id JOIN connected_repositories r ON r.id=e.repository_id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=e.organization_id WHERE e.id=$1 AND e.organization_id=$2 AND e.status='completed' AND j.status<>'cancelled' AND r.active=true AND i.connected=true LIMIT 1",
        [id, workspace],
      )
    ).rows[0];
    if (
      !row ||
      row.size > 20971520 ||
      createHash("sha256").update(row.payload).digest("hex") !== row.hash ||
      Buffer.byteLength(row.payload) !== row.size
    )
      throw new WorkspaceAccessError();
    return row;
  }
  issue(actor: string, workspace: string, exportId: string) {
    return this.store.transaction(
      actor,
      workspace,
      async ({ client, permissions }) => {
        requireCapability(permissions.exportAnalysis);
        const row = (
          await client.query<{ job_id: string }>(
            "SELECT job_id FROM export_jobs WHERE id=$1 AND organization_id=$2 AND status='completed'",
            [exportId, workspace],
          )
        ).rows[0];
        if (!row) throw new WorkspaceAccessError();
        const artifact = await this.artifact(client, workspace, exportId),
          id = randomUUID(),
          expiresAt = new Date(Date.now() + 5 * 60000).toISOString(),
          signature = signDownload(
            this.secret,
            id,
            actor,
            exportId,
            artifact.hash,
            expiresAt,
          );
        await client.query(
          "INSERT INTO export_download_grants(id,organization_id,export_id,actor_id,artifact_hash,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
          [id, workspace, exportId, actor, artifact.hash, expiresAt],
        );
        await auditTeam(
          client,
          workspace,
          actor,
          "download.issued",
          id,
          "download-issued",
        );
        return { id, url: `/downloads#${id}.${signature}`, expiresAt };
      },
      true,
    );
  }
  async redeem(actor: string, id: string, signature: string) {
    const scope = (
      await this.store.pool.query<{ organization_id: string }>(
        "SELECT organization_id FROM export_download_grants WHERE id=$1 AND actor_id=$2",
        [id, actor],
      )
    ).rows[0];
    if (!scope) throw new WorkspaceAccessError();
    return this.store.transaction(
      actor,
      scope.organization_id,
      async ({ client, permissions }) => {
        requireCapability(permissions.exportAnalysis);
        const row = (
          await client.query<{
            export_id: string;
            artifact_hash: string;
            expires_at: Date;
            job_id: string;
          }>(
            "SELECT g.export_id,g.artifact_hash,g.expires_at,e.job_id FROM export_download_grants g JOIN export_jobs e ON e.id=g.export_id AND e.organization_id=g.organization_id JOIN analysis_jobs j ON j.id=e.job_id AND j.organization_id=e.organization_id AND j.repository_id=e.repository_id JOIN connected_repositories r ON r.id=e.repository_id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=e.organization_id WHERE g.id=$1 AND g.organization_id=$2 AND g.actor_id=$3 AND g.used_at IS NULL AND g.revoked_at IS NULL AND g.expires_at>now() AND e.status='completed' AND r.active=true AND i.connected=true AND j.status<>'cancelled' FOR UPDATE OF g",
            [id, scope.organization_id, actor],
          )
        ).rows[0];
        if (!row) throw new WorkspaceAccessError();
        const expected = signDownload(
          this.secret,
          id,
          actor,
          row.export_id,
          row.artifact_hash,
          row.expires_at.toISOString(),
        );
        if (
          !/^[a-f0-9]{64}$/.test(signature) ||
          !timingSafeEqual(
            Buffer.from(signature, "hex"),
            Buffer.from(expected, "hex"),
          )
        )
          throw new WorkspaceAccessError();
        const artifact = await this.artifact(
          client,
          scope.organization_id,
          row.export_id,
        );
        if (
          artifact.hash !== row.artifact_hash ||
          createHash("sha256").update(artifact.payload).digest("hex") !==
            row.artifact_hash ||
          Buffer.byteLength(artifact.payload) !== artifact.size
        )
          throw new WorkspaceAccessError();
        await client.query(
          "UPDATE export_download_grants SET used_at=now() WHERE id=$1",
          [id],
        );
        await auditTeam(
          client,
          scope.organization_id,
          actor,
          "download.used",
          id,
          "download-used",
        );
        return artifact;
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
              "UPDATE export_download_grants SET revoked_at=now() WHERE id=$1 AND organization_id=$2 AND (actor_id=$3 OR $4) RETURNING id",
              [id, workspace, actor, permissions.manageWorkspace],
            )
          ).rowCount
        )
          throw new WorkspaceAccessError();
        await auditTeam(client, workspace, actor, "download.revoked", id);
        return { revoked: true };
      },
      true,
    );
  }
}
