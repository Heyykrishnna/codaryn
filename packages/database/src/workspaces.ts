import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { z } from "zod";

const workspaceName = z.string().trim().min(1).max(100);
const identifier = z.uuid();
export type WorkspaceRole = "owner" | "admin" | "member";
export interface Workspace {
  id: string;
  name: string;
  role: WorkspaceRole;
}

export class WorkspaceAccessError extends Error {
  constructor() {
    super("Workspace not found or access denied");
  }
}

async function transaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
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

async function audit(
  client: PoolClient,
  organizationId: string,
  actorId: string,
  action: string,
  targetId: string,
) {
  await client.query(
    "INSERT INTO audit_events (id, organization_id, actor_id, action, target_id) VALUES ($1, $2, $3, $4, $5)",
    [randomUUID(), organizationId, actorId, action, targetId],
  );
}

export class WorkspaceService {
  constructor(private readonly pool: Pool) {}

  async create(actorId: string, name: string): Promise<Workspace> {
    const validatedName = workspaceName.parse(name);
    const id = randomUUID();
    return transaction(this.pool, async (client) => {
      await client.query(
        "INSERT INTO organizations (id, name) VALUES ($1, $2)",
        [id, validatedName],
      );
      await client.query(
        "INSERT INTO organization_members (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
        [id, actorId],
      );
      await audit(client, id, actorId, "workspace.created", id);
      return { id, name: validatedName, role: "owner" };
    });
  }

  async list(actorId: string, limit = 50, offset = 0): Promise<Workspace[]> {
    const pageSize = z.number().int().min(1).max(100).parse(limit);
    const pageOffset = z.number().int().min(0).max(100000).parse(offset);
    const result = await this.pool.query<Workspace>(
      "SELECT o.id, o.name, m.role FROM organizations o JOIN organization_members m ON m.organization_id = o.id WHERE o.deleted_at IS NULL AND m.user_id = $1 ORDER BY o.created_at, o.id LIMIT $2 OFFSET $3",
      [actorId, pageSize, pageOffset],
    );
    return result.rows;
  }

  async rename(
    actorId: string,
    workspaceId: string,
    name: string,
  ): Promise<void> {
    const id = identifier.parse(workspaceId);
    const validatedName = workspaceName.parse(name);
    await transaction(this.pool, async (client) => {
      const result = await client.query(
        "UPDATE organizations o SET name = $3, updated_at = now() WHERE o.deleted_at IS NULL AND o.id = $1 AND EXISTS (SELECT 1 FROM organization_members m WHERE m.organization_id = o.id AND m.user_id = $2 AND m.role IN ('owner', 'admin')) RETURNING o.id",
        [id, actorId, validatedName],
      );
      if (result.rowCount !== 1) throw new WorkspaceAccessError();
      await audit(client, id, actorId, "workspace.renamed", id);
    });
  }
  async details(actorId: string, workspaceId: string) {
    const id = identifier.parse(workspaceId);
    const result = await this.pool.query<Workspace>(
      "SELECT o.id, o.name, m.role FROM organizations o JOIN organization_members m ON m.organization_id=o.id WHERE o.deleted_at IS NULL AND o.id=$1 AND m.user_id=$2",
      [id, actorId],
    );
    if (!result.rows[0]) throw new WorkspaceAccessError();
    const members = await this.pool.query<{
      userId: string;
      role: WorkspaceRole;
    }>(
      'SELECT user_id AS "userId", role FROM organization_members WHERE organization_id=$1 ORDER BY created_at LIMIT 100',
      [id],
    );
    const events = await this.pool.query<{
      action: string;
      actorId: string;
      createdAt: Date;
    }>(
      'SELECT action, actor_id AS "actorId", created_at AS "createdAt" FROM audit_events WHERE organization_id=$1 ORDER BY created_at DESC LIMIT 100',
      [id],
    );
    return { ...result.rows[0], members: members.rows, events: events.rows };
  }

  async switchWorkspace(actorId: string, workspaceId: string) {
    const workspace = await this.details(actorId, workspaceId);
    await this.pool.query(
      "INSERT INTO workspace_preferences (user_id, organization_id) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET organization_id=EXCLUDED.organization_id",
      [actorId, workspace.id],
    );
  }

  async active(actorId: string): Promise<string | null> {
    const result = await this.pool.query<{ organization_id: string }>(
      "SELECT p.organization_id FROM workspace_preferences p JOIN organization_members m ON m.organization_id=p.organization_id AND m.user_id=p.user_id WHERE p.user_id=$1",
      [actorId],
    );
    return result.rows[0]?.organization_id ?? null;
  }

  async invite(
    actorId: string,
    workspaceId: string,
    recipientId: string,
    role: "admin" | "member",
  ) {
    const id = identifier.parse(workspaceId);
    const recipient = identifier.parse(recipientId);
    const selectedRole = z.enum(["admin", "member"]).parse(role);
    return transaction(this.pool, async (client) => {
      await this.authorize(
        client,
        actorId,
        id,
        selectedRole === "admin" ? ["owner"] : ["owner", "admin"],
      );
      const user = await client.query("SELECT id FROM app_users WHERE id=$1", [
        recipient,
      ]);
      if (!user.rowCount) throw new WorkspaceAccessError();
      const invitationId = randomUUID();
      await client.query(
        "INSERT INTO workspace_invitations (id,organization_id,recipient_id,role,expires_at) VALUES ($1,$2,$3,$4,now()+interval '7 days')",
        [invitationId, id, recipient, selectedRole],
      );
      await audit(client, id, actorId, "member.invited", recipient);
      return invitationId;
    });
  }

  async invitations(actorId: string) {
    const result = await this.pool.query<{
      id: string;
      name: string;
      role: string;
    }>(
      "SELECT i.id,o.name,i.role FROM workspace_invitations i JOIN organizations o ON o.id=i.organization_id WHERE i.recipient_id=$1 AND i.accepted_at IS NULL AND i.expires_at>now() ORDER BY i.expires_at LIMIT 100",
      [actorId],
    );
    return result.rows;
  }

  async accept(actorId: string, invitationId: string) {
    const id = identifier.parse(invitationId);
    await transaction(this.pool, async (client) => {
      const workspace = await client.query(
        "SELECT o.id FROM organizations o JOIN workspace_invitations i ON i.organization_id=o.id WHERE i.id=$1 AND i.recipient_id=$2 AND o.deleted_at IS NULL FOR UPDATE OF o",
        [id, actorId],
      );
      if (!workspace.rowCount) throw new WorkspaceAccessError();
      const result = await client.query<{
        organization_id: string;
        role: string;
      }>(
        "UPDATE workspace_invitations SET accepted_at=now() WHERE id=$1 AND recipient_id=$2 AND accepted_at IS NULL AND expires_at>now() RETURNING organization_id,role",
        [id, actorId],
      );
      const invitation = result.rows[0];
      if (!invitation) throw new WorkspaceAccessError();
      await client.query(
        "INSERT INTO organization_members (organization_id,user_id,role) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [invitation.organization_id, actorId, invitation.role],
      );
      await audit(
        client,
        invitation.organization_id,
        actorId,
        "member.joined",
        actorId,
      );
    });
  }

  private async authorize(
    client: PoolClient,
    actorId: string,
    workspaceId: string,
    roles: WorkspaceRole[],
  ) {
    const workspace = await client.query(
      "SELECT id FROM organizations WHERE deleted_at IS NULL AND id=$1 FOR UPDATE",
      [workspaceId],
    );
    if (!workspace.rowCount) throw new WorkspaceAccessError();
    const membership = await client.query<{ role: WorkspaceRole }>(
      "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",
      [workspaceId, actorId],
    );
    if (!membership.rows[0] || !roles.includes(membership.rows[0].role))
      throw new WorkspaceAccessError();
    return membership.rows[0].role;
  }

  async changeMember(
    actorId: string,
    workspaceId: string,
    targetId: string,
    role: "admin" | "member" | null,
  ) {
    const id = identifier.parse(workspaceId);
    const target = identifier.parse(targetId);
    const selectedRole = z.enum(["admin", "member"]).nullable().parse(role);
    await transaction(this.pool, async (client) => {
      const actorRole = await this.authorize(
        client,
        actorId,
        id,
        selectedRole === null && actorId === target
          ? ["owner", "admin", "member"]
          : ["owner"],
      );
      const member = await client.query<{ role: string }>(
        "SELECT role FROM organization_members WHERE organization_id=$1 AND user_id=$2",
        [id, target],
      );
      if (
        !member.rows[0] ||
        member.rows[0].role === "owner" ||
        (actorRole !== "owner" && actorId !== target)
      )
        throw new WorkspaceAccessError();
      if (selectedRole === null)
        await client.query(
          "DELETE FROM organization_members WHERE organization_id=$1 AND user_id=$2",
          [id, target],
        );
      else
        await client.query(
          "UPDATE organization_members SET role=$3 WHERE organization_id=$1 AND user_id=$2",
          [id, target, selectedRole],
        );
      await audit(
        client,
        id,
        actorId,
        selectedRole === null ? "member.removed" : "member.role_changed",
        target,
      );
    });
  }

  async delete(actorId: string, workspaceId: string) {
    const id = identifier.parse(workspaceId);
    await transaction(this.pool, async (client) => {
      await this.authorize(client, actorId, id, ["owner"]);
      await audit(client, id, actorId, "workspace.deleted", id);
      await client.query(
        "UPDATE organizations SET deleted_at=now() WHERE id=$1",
        [id],
      );
      await client.query(
        "DELETE FROM organization_members WHERE organization_id=$1",
        [id],
      );
      await client.query(
        "DELETE FROM workspace_invitations WHERE organization_id=$1",
        [id],
      );
    });
  }
}
