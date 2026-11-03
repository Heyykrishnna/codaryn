import { z } from "zod";
import type { WorkspaceService } from "@codaryn/database";
import { RequestFailure } from "../http/access.js";

type Input = Record<string, unknown>;
export function workspaceActions(service: WorkspaceService) {
  const reads: Record<
    string,
    (actor: string, input: Input) => Promise<unknown>
  > = {
    list: async (actor) => ({
      workspaces: await service.list(actor),
      active: await service.active(actor),
    }),
    invitations: async (actor) => ({
      invitations: await service.invitations(actor),
    }),
    details: (actor, input) =>
      service.details(actor, z.string().parse(input.id)),
  };
  const writes: Record<
    string,
    (actor: string, input: Input) => Promise<unknown>
  > = {
    create: (actor, input) =>
      service.create(actor, z.string().parse(input.name)),
    rename: (actor, input) =>
      service.rename(
        actor,
        z.string().parse(input.id),
        z.string().parse(input.name),
      ),
    switch: (actor, input) =>
      service.switchWorkspace(actor, z.string().parse(input.id)),
    invite: async (actor, input) => ({
      id: await service.invite(
        actor,
        z.string().parse(input.id),
        z.string().parse(input.recipientId),
        z.enum(["admin", "member"]).parse(input.role),
      ),
    }),
    accept: (actor, input) => service.accept(actor, z.string().parse(input.id)),
    member: (actor, input) =>
      service.changeMember(
        actor,
        z.string().parse(input.id),
        z.string().parse(input.userId),
        z.enum(["admin", "member"]).nullable().parse(input.role),
      ),
    delete: (actor, input) => service.delete(actor, z.string().parse(input.id)),
  };
  return { reads, writes };
}
export function requireFreshWorkspaceSession(
  path: string,
  input: Input,
  createdAt: Date,
) {
  const sensitive =
    path === "delete" || (path === "member" && input.role !== null);
  if (sensitive && Date.now() - createdAt.getTime() > 3600000)
    throw new RequestFailure(
      403,
      "REAUTHENTICATE",
      "Sign out and sign in again before changing roles or deleting a workspace",
    );
}
