import type { FastifyInstance } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { Pool } from "pg";
import { z } from "zod";
import { WorkspaceService, WorkspaceAccessError } from "@codaryn/database";
import type { IdentityAuth } from "./auth.js";

export function registerIdentity(
  app: FastifyInstance,
  auth: Pick<IdentityAuth, "handler"> & {
    api: Pick<IdentityAuth["api"], "getSession">;
  },
  pool: Pool,
  baseURL: string,
  origin: string,
) {
  const workspaces = new WorkspaceService(pool);
  app.route({
    method: ["GET", "POST"],
    url: "/api/auth/*",
    handler: async (request, reply) => {
      const headers = fromNodeHeaders(request.headers);
      headers.set("x-codaryn-client-ip", request.ip);
      const response = await auth.handler(
        new Request(new URL(request.url, baseURL), {
          method: request.method,
          headers,
          ...(request.body ? { body: JSON.stringify(request.body) } : {}),
        }),
      );
      reply.status(response.status);
      reply.header("cache-control", "no-store");
      response.headers.forEach((value, key) => {
        if (key !== "set-cookie") reply.header(key, value);
      });
      const cookies = response.headers.getSetCookie();
      if (cookies.length) reply.header("set-cookie", cookies);
      return reply.send(await response.text());
    },
  });
  app.register(async (protectedApp) => {
    protectedApp.addHook("onRequest", async (request, reply) => {
      reply.header("cache-control", "no-store");
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
      });
      if (!session)
        return reply.code(401).send({
          error: { code: "UNAUTHENTICATED", message: "Sign in to continue" },
        });
      if (
        !["GET", "HEAD"].includes(request.method) &&
        (request.headers.origin !== origin ||
          request.headers["x-codaryn-request"] !== "workspace")
      )
        return reply.code(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Request origin is not allowed",
          },
        });
    });
    protectedApp.route({
      method: ["GET", "POST"],
      url: "/api/v1/workspace/*",
      handler: async (request, reply) => {
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session)
          return reply.code(401).send({
            error: {
              code: "UNAUTHENTICATED",
              message: "Sign in to continue",
            },
          });
        const actor = session.user.id;
        const path = request.url
          .split("?")[0]
          .slice("/api/v1/workspace/".length);
        try {
          const body = z
            .record(z.string(), z.unknown())
            .parse(request.body ?? {});
          if (
            request.method === "POST" &&
            (path === "delete" || (path === "member" && body.role !== null)) &&
            Date.now() - session.session.createdAt.getTime() > 3600000
          ) {
            return reply.code(403).send({
              error: {
                code: "REAUTHENTICATE",
                message:
                  "Sign out and sign in again before changing roles or deleting a workspace",
              },
            });
          }
          if (request.method === "GET") {
            if (path === "list")
              return {
                workspaces: await workspaces.list(actor),
                active: await workspaces.active(actor),
              };
            if (path === "invitations")
              return { invitations: await workspaces.invitations(actor) };
            if (path === "details")
              return await workspaces.details(
                actor,
                z
                  .string()
                  .parse(z.object({ id: z.string() }).parse(request.query).id),
              );
          } else {
            if (path === "create")
              return await workspaces.create(
                actor,
                z.string().parse(body.name),
              );
            if (path === "rename")
              await workspaces.rename(
                actor,
                z.string().parse(body.id),
                z.string().parse(body.name),
              );
            else if (path === "switch")
              await workspaces.switchWorkspace(
                actor,
                z.string().parse(body.id),
              );
            else if (path === "invite")
              return {
                id: await workspaces.invite(
                  actor,
                  z.string().parse(body.id),
                  z.string().parse(body.recipientId),
                  z.enum(["admin", "member"]).parse(body.role),
                ),
              };
            else if (path === "accept")
              await workspaces.accept(actor, z.string().parse(body.id));
            else if (path === "member")
              await workspaces.changeMember(
                actor,
                z.string().parse(body.id),
                z.string().parse(body.userId),
                z.enum(["admin", "member"]).nullable().parse(body.role),
              );
            else if (path === "delete")
              await workspaces.delete(actor, z.string().parse(body.id));
            else
              return reply.code(404).send({
                error: { code: "NOT_FOUND", message: "Resource not found" },
              });
            return { success: true };
          }
          return reply.code(404).send({
            error: { code: "NOT_FOUND", message: "Resource not found" },
          });
        } catch (error) {
          if (error instanceof WorkspaceAccessError)
            return reply.code(404).send({
              error: {
                code: "NOT_FOUND",
                message: "Resource not found or access denied",
              },
            });
          if (error instanceof z.ZodError)
            return reply.code(400).send({
              error: {
                code: "INVALID_INPUT",
                message: "Check the submitted values",
              },
            });
          throw error;
        }
      },
    });
  });
}
