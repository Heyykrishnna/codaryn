import type { FastifyInstance } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { Pool } from "pg";
import { z } from "zod";
import { WorkspaceService } from "@codaryn/database";
import { failure, requireSession, requestError } from "../http/access.js";
import {
  workspaceActions,
  requireFreshWorkspaceSession,
} from "./workspace-actions.js";
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
  const actions = workspaceActions(workspaces);
  app.route({
    method: ["GET", "POST"],
    url: "/api/v1/workspace/*",
    handler: async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      const path = request.url.split("?")[0].slice("/api/v1/workspace/".length);
      try {
        const read = request.method === "GET";
        const input = z
          .record(z.string(), z.unknown())
          .parse(read ? request.query : (request.body ?? {}));
        if (!read)
          requireFreshWorkspaceSession(path, input, session.session.createdAt);
        const table = read ? actions.reads : actions.writes;
        const action = Object.hasOwn(table, path) ? table[path] : undefined;
        if (!action)
          return failure(reply, 404, "NOT_FOUND", "Resource not found");
        return (await action(session.user.id, input)) ?? { success: true };
      } catch (error) {
        return requestError(reply, error);
      }
    },
  });
}
