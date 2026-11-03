import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";
import { WorkspaceAccessError } from "@codaryn/database";
import type { GitHubGateway } from "@codaryn/github";

interface Installation {
  id: string;
  generation: number;
}
interface StoredRepository {
  id: string;
  full_name: string;
  installation_id: string;
  generation: number;
}
export class RepositoryService {
  constructor(
    private readonly pool: Pool,
    private readonly github: GitHubGateway,
  ) {}
  private async membership(
    actor: string,
    workspace: string,
    manage = false,
    client: Pool | PoolClient = this.pool,
  ) {
    z.uuid().parse(workspace);
    const result = await client.query<{ role: string }>(
      "SELECT m.role FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND o.id=$2 AND o.deleted_at IS NULL",
      [actor, workspace],
    );
    if (
      !result.rows[0] ||
      (manage && !["owner", "admin"].includes(result.rows[0].role))
    )
      throw new WorkspaceAccessError();
  }
  private async transaction<T>(operation: (client: PoolClient) => Promise<T>) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
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
  async connect(
    actor: string,
    workspace: string,
    installation: number,
    userToken: string,
  ) {
    await this.membership(actor, workspace, true);
    await this.github.verifyInstallation(installation, userToken);
    await this.transaction(async (client) => {
      await client.query(
        "SELECT id FROM organizations WHERE id=$1 FOR UPDATE",
        [workspace],
      );
      await this.membership(actor, workspace, true, client);
      const existing = await client.query<{ organization_id: string }>(
        "SELECT organization_id FROM github_installations WHERE id=$1 FOR UPDATE",
        [installation],
      );
      if (existing.rows[0] && existing.rows[0].organization_id !== workspace)
        throw new WorkspaceAccessError();
      const linked = await client.query(
        "INSERT INTO github_installations (id,organization_id) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET connected=true,generation=github_installations.generation+1,updated_at=now() WHERE github_installations.organization_id=EXCLUDED.organization_id RETURNING id",
        [installation, workspace],
      );
      if (!linked.rowCount) throw new WorkspaceAccessError();
      await client.query(
        "INSERT INTO audit_events (id,organization_id,actor_id,action,target_id) VALUES ($1,$2,$3,'github.connected',$4)",
        [randomUUID(), workspace, actor, String(installation)],
      );
    });
  }
  async installations(actor: string, workspace: string) {
    await this.membership(actor, workspace);
    return (
      await this.pool.query<{ id: string; connected: boolean }>(
        "SELECT id,connected FROM github_installations WHERE organization_id=$1 ORDER BY id",
        [workspace],
      )
    ).rows;
  }
  async disconnect(actor: string, workspace: string, installation: number) {
    await this.transaction(async (client) => {
      await this.membership(actor, workspace, true, client);
      const result = await client.query(
        "UPDATE github_installations SET connected=false,generation=generation+1,updated_at=now() WHERE id=$1 AND organization_id=$2 RETURNING id",
        [installation, workspace],
      );
      if (!result.rowCount) throw new WorkspaceAccessError();
      await client.query(
        "UPDATE connected_repositories SET active=false WHERE installation_id=$1",
        [installation],
      );
      await client.query(
        "INSERT INTO audit_events (id,organization_id,actor_id,action,target_id) VALUES ($1,$2,$3,'github.disconnected',$4)",
        [randomUUID(), workspace, actor, String(installation)],
      );
    });
  }
  async sync(actor: string, workspace: string, installation: number) {
    await this.membership(actor, workspace, true);
    const before = await this.pool.query<Installation>(
      "SELECT id,generation FROM github_installations WHERE id=$1 AND organization_id=$2 AND connected=true",
      [installation, workspace],
    );
    if (!before.rows[0]) throw new WorkspaceAccessError();
    const repositories = await this.github.repositories(installation);
    await this.transaction(async (client) => {
      await this.membership(actor, workspace, true, client);
      const current = await client.query<Installation>(
        "SELECT id,generation FROM github_installations WHERE id=$1 AND organization_id=$2 AND connected=true FOR UPDATE",
        [installation, workspace],
      );
      if (
        !current.rows[0] ||
        current.rows[0].generation !== before.rows[0].generation
      )
        throw new WorkspaceAccessError();
      await client.query(
        "UPDATE connected_repositories SET active=false WHERE installation_id=$1",
        [installation],
      );
      for (const repository of repositories)
        await client.query(
          "INSERT INTO connected_repositories (id,installation_id,github_id,full_name,private,default_branch) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (installation_id,github_id) DO UPDATE SET full_name=EXCLUDED.full_name,private=EXCLUDED.private,default_branch=EXCLUDED.default_branch,active=true",
          [
            randomUUID(),
            installation,
            repository.id,
            repository.full_name,
            repository.private,
            repository.default_branch,
          ],
        );
    });
  }
  async list(actor: string, workspace: string, page: number) {
    await this.membership(actor, workspace);
    return (
      await this.pool.query<{
        id: string;
        fullName: string;
        private: boolean;
        defaultBranch: string;
        installationId: string;
      }>(
        `SELECT r.id,r.full_name AS "fullName",r.private,r.default_branch AS "defaultBranch",r.installation_id AS "installationId" FROM connected_repositories r JOIN github_installations i ON i.id=r.installation_id WHERE i.organization_id=$1 AND i.connected=true AND r.active=true ORDER BY r.full_name,r.id LIMIT 50 OFFSET $2`,
        [workspace, (page - 1) * 50],
      )
    ).rows;
  }
  private async repository(actor: string, workspace: string, id: string) {
    await this.membership(actor, workspace);
    const result = await this.pool.query<StoredRepository>(
      "SELECT r.id,r.full_name,r.installation_id,i.generation FROM connected_repositories r JOIN github_installations i ON i.id=r.installation_id WHERE r.id=$1 AND i.organization_id=$2 AND i.connected=true AND r.active=true",
      [z.uuid().parse(id), workspace],
    );
    if (!result.rows[0]) throw new WorkspaceAccessError();
    return result.rows[0];
  }
  async branches(actor: string, workspace: string, id: string, page: number) {
    const repository = await this.repository(actor, workspace, id);
    return this.github.branches(
      Number(repository.installation_id),
      repository.full_name,
      page,
    );
  }
  async commits(
    actor: string,
    workspace: string,
    id: string,
    branch: string,
    page: number,
  ) {
    const repository = await this.repository(actor, workspace, id);
    return this.github.commits(
      Number(repository.installation_id),
      repository.full_name,
      branch,
      page,
    );
  }
  async ingest(actor: string, workspace: string, id: string, ref: string) {
    const repository = await this.repository(actor, workspace, id);
    const sha = await this.github.resolve(
      Number(repository.installation_id),
      repository.full_name,
      ref,
    );
    const runId = randomUUID();
    await this.transaction(async (client) => {
      await this.membership(actor, workspace, false, client);
      const active = await client.query(
        "SELECT i.id FROM github_installations i JOIN connected_repositories r ON r.installation_id=i.id WHERE r.id=$1 AND r.active=true AND i.connected=true AND i.generation=$2 FOR SHARE OF i,r",
        [id, repository.generation],
      );
      if (!active.rowCount) throw new WorkspaceAccessError();
      await client.query(
        "INSERT INTO ingestion_runs (id,repository_id,actor_id,commit_sha,installation_generation,status) VALUES ($1,$2,$3,$4,$5,'queued')",
        [runId, id, actor, sha, repository.generation],
      );
    });
    return { id: runId, commitSha: sha, status: "queued" };
  }
  async runs(actor: string, workspace: string, id: string) {
    const repository = await this.repository(actor, workspace, id);
    const result = await this.pool.query<{
      id: string;
      commitSha: string;
      status: string;
      errorCode: string | null;
      inventory: unknown;
      createdAt: Date;
    }>(
      `SELECT id,commit_sha AS "commitSha",status,error_code AS "errorCode",CASE WHEN inventory IS NULL THEN NULL ELSE jsonb_build_object('fileCount',jsonb_array_length(inventory->'files'),'packageRoots',inventory->'packageRoots','archiveSha256',inventory->'archiveSha256','monorepo',inventory->'monorepo') END AS inventory,created_at AS "createdAt" FROM ingestion_runs WHERE repository_id=$1 ORDER BY created_at DESC LIMIT 10`,
      [id],
    );
    if (result.rows[0])
      await this.github.resolve(
        Number(repository.installation_id),
        repository.full_name,
        result.rows[0].commitSha,
      );
    return result.rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }));
  }
}
