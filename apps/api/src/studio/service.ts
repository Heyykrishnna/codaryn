import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { WorkspaceAccessError } from "@codaryn/database";
import {
  normalizeStudioConfiguration,
  studioProfileSchema,
  studioManifestResponseSchema,
} from "@codaryn/contracts";
import type { RepositoryService } from "../repositories/service.js";
import { RequestFailure } from "../http/access.js";
import { createManifest } from "./manifest.js";

export class StudioService {
  constructor(
    private readonly pool: Pool,
    private readonly repositories: Pick<
      RepositoryService,
      "resolveSelection"
    > | null,
  ) {}
  private async access(
    client: PoolClient,
    actor: string,
    workspace: string,
    manage: boolean,
  ) {
    const result = await client.query<{ role: string }>(
      "SELECT m.role FROM organization_members m JOIN organizations o ON o.id=m.organization_id WHERE m.user_id=$1 AND o.id=$2 AND o.deleted_at IS NULL FOR SHARE OF m,o",
      [actor, workspace],
    );
    const role = result.rows[0]?.role;
    if (!role || (manage && !["owner", "admin"].includes(role)))
      throw new WorkspaceAccessError();
  }
  private async transaction<T>(
    actor: string,
    workspace: string,
    manage: boolean,
    operation: (client: PoolClient) => Promise<T>,
    serialize = manage,
  ) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      if (serialize)
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
          [workspace],
        );
      await this.access(client, actor, workspace, manage);
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
  profiles(actor: string, workspace: string, page: number) {
    return this.transaction(actor, workspace, false, async (client) => {
      const result = await client.query<{
        id: string;
        name: string;
        revision: number;
        configuration: unknown;
      }>(
        "SELECT id,name,revision,configuration FROM analysis_profiles WHERE organization_id=$1 ORDER BY updated_at DESC,id LIMIT 50 OFFSET $2",
        [workspace, (page - 1) * 50],
      );
      return {
        profiles: result.rows.map((row) => studioProfileSchema.parse(row)),
      };
    });
  }
  save(
    actor: string,
    workspace: string,
    name: string,
    input: unknown,
    id?: string,
    revision?: number,
  ) {
    const configuration = normalizeStudioConfiguration(input);
    return this.transaction(actor, workspace, true, async (client) => {
      const profileId = id ?? randomUUID();
      if (!id) {
        const count = await client.query<{ count: string }>(
          "SELECT count(*) FROM analysis_profiles WHERE organization_id=$1",
          [workspace],
        );
        if (Number(count.rows[0].count) >= 100)
          throw new RequestFailure(
            409,
            "PROFILE_LIMIT",
            "This workspace has reached its 100 profile limit",
          );
      }
      const result = id
        ? await client.query(
            "UPDATE analysis_profiles SET name=$3,configuration=$4,revision=revision+1,updated_at=now() WHERE id=$1 AND organization_id=$2 AND revision=$5 RETURNING id,name,revision,configuration",
            [id, workspace, name, configuration, revision],
          )
        : await client.query(
            "INSERT INTO analysis_profiles (id,organization_id,name,revision,configuration,created_by) VALUES ($1,$2,$3,1,$4,$5) RETURNING id,name,revision,configuration",
            [profileId, workspace, name, configuration, actor],
          );
      if (!result.rows[0])
        throw new RequestFailure(
          409,
          "PROFILE_CONFLICT",
          "Profile unavailable or changed. Reload before editing.",
        );
      const profile = studioProfileSchema.parse(result.rows[0]);
      await client.query(
        "INSERT INTO analysis_profile_versions (id,profile_id,revision,configuration,created_by) VALUES ($1,$2,$3,$4,$5)",
        [randomUUID(), profile.id, profile.revision, configuration, actor],
      );
      await this.audit(
        client,
        actor,
        workspace,
        "analysis.profile.saved",
        profile.id,
      );
      return profile;
    });
  }
  remove(actor: string, workspace: string, id: string, revision: number) {
    return this.transaction(actor, workspace, true, async (client) => {
      const result = await client.query(
        "DELETE FROM analysis_profiles WHERE id=$1 AND organization_id=$2 AND revision=$3",
        [id, workspace, revision],
      );
      if (!result.rowCount)
        throw new RequestFailure(
          409,
          "PROFILE_CONFLICT",
          "Profile unavailable or changed. Reload before deleting.",
        );
      await this.audit(
        client,
        actor,
        workspace,
        "analysis.profile.deleted",
        id,
      );
      return { success: true };
    });
  }
  validate(actor: string, workspace: string, input: unknown) {
    return this.transaction(actor, workspace, false, () =>
      Promise.resolve({ configuration: normalizeStudioConfiguration(input) }),
    );
  }
  async start(
    actor: string,
    workspace: string,
    repositoryId: string,
    ref: string,
    configuration: unknown,
  ) {
    const normalized = normalizeStudioConfiguration(configuration);
    if (!this.repositories)
      throw new RequestFailure(
        503,
        "GITHUB_NOT_CONFIGURED",
        "Configure the GitHub App to verify the selected commit",
      );
    const selection = await this.repositories.resolveSelection(
      actor,
      workspace,
      repositoryId,
      ref,
    );
    const content = createManifest(
      repositoryId,
      selection.commitSha,
      normalized,
    );
    return this.transaction(
      actor,
      workspace,
      false,
      async (client) => {
        const active = await client.query(
          "SELECT r.id FROM connected_repositories r JOIN github_installations i ON i.id=r.installation_id WHERE r.id=$1 AND i.organization_id=$2 AND r.active=true AND i.connected=true AND i.generation=$3 FOR SHARE OF r,i",
          [repositoryId, workspace, selection.generation],
        );
        if (!active.rowCount) throw new WorkspaceAccessError();
        const recent = await client.query<{ count: string }>(
          "SELECT count(*) FROM analysis_manifests WHERE organization_id=$1 AND created_at > now()-interval '1 minute'",
          [workspace],
        );
        if (Number(recent.rows[0].count) >= 30)
          throw new RequestFailure(
            429,
            "MANIFEST_LIMIT",
            "Wait before creating more manifests in this workspace",
          );
        const id = randomUUID();
        await client.query(
          "INSERT INTO analysis_manifests (id,organization_id,repository_id,actor_id,manifest,hash) VALUES ($1,$2,$3,$4,$5,$6)",
          [id, workspace, repositoryId, actor, content.manifest, content.hash],
        );
        await this.audit(
          client,
          actor,
          workspace,
          "analysis.manifest.created",
          id,
        );
        return studioManifestResponseSchema.parse({
          id,
          status: "configured",
          ...content,
        });
      },
      true,
    );
  }
  history(actor: string, workspace: string, page: number) {
    return this.transaction(actor, workspace, false, async (client) => {
      const result = await client.query(
        "SELECT id,hash,status,manifest FROM analysis_manifests WHERE organization_id=$1 ORDER BY created_at DESC,id LIMIT 50 OFFSET $2",
        [workspace, (page - 1) * 50],
      );
      return {
        manifests: result.rows.map((row) =>
          studioManifestResponseSchema.parse(row),
        ),
      };
    });
  }
  private async audit(
    client: PoolClient,
    actor: string,
    workspace: string,
    action: string,
    id: string,
  ) {
    await client.query(
      "INSERT INTO audit_events (id,organization_id,actor_id,action,target_id) VALUES ($1,$2,$3,$4,$5)",
      [randomUUID(), workspace, actor, action, id],
    );
  }
}
