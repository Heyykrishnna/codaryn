import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  requireSession,
  requestError,
  failure,
  type SessionReader,
} from "../http/access.js";
import type { ExecutionService } from "./service.js";
const querySchema = z.object({
  workspaceId: z.uuid(),
  snapshotId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  scope: z.enum(["intraprocedural"]).default("intraprocedural"),
  search: z.string().max(100).default(""),
  functionId: z.string().min(1).max(1024).optional(),
  targetId: z.string().min(1).max(1024).optional(),
  depth: z.coerce.number().int().min(1).max(12).default(3),
});
export function registerExecution(
  app: FastifyInstance,
  auth: SessionReader,
  service: ExecutionService,
  origin: string,
) {
  app.post(
    "/api/v1/execution/request",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const input = z
          .strictObject({ workspaceId: z.uuid(), jobId: z.uuid() })
          .parse(request.body);
        return reply
          .code(202)
          .send(
            await service.request(
              session.user.id,
              input.workspaceId,
              input.jobId,
            ),
          );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );
  app.get("/api/v1/execution/:action", async (request, reply) => {
    const session = await requireSession(auth, request, reply, origin);
    if (!session) return reply;
    try {
      const q = querySchema.parse(request.query),
        { action } = z.object({ action: z.string() }).parse(request.params),
        actor = session.user.id;
      if (action === "jobs") return await service.jobs(actor, q.workspaceId);
      if (action === "snapshots")
        return await service.list(actor, q.workspaceId, q.page);
      const id = z.uuid().parse(q.snapshotId);
      if (action === "overview")
        return await service.overview(actor, q.workspaceId, id);
      if (
        action === "functions" ||
        action === "calls" ||
        action === "entries" ||
        action === "unresolved"
      )
        return await service.objects(actor, q.workspaceId, id, {
          kind: action,
          page: q.page,
          search: q.search,
        });
      if (
        action === "function" ||
        action === "data-flow" ||
        action === "control-flow"
      )
        return await service.inspect(
          actor,
          q.workspaceId,
          id,
          z.string().min(1).parse(q.functionId),
        );
      if (action === "paths")
        return await service.traverse(actor, q.workspaceId, id, {
          from: z.string().min(1).parse(q.functionId),
          to: z.string().min(1).parse(q.targetId),
          depth: q.depth,
        });
      if (action === "neighborhood")
        return await service.traverse(actor, q.workspaceId, id, {
          from: z.string().min(1).parse(q.functionId),
          depth: z.number().max(3).parse(q.depth),
        });
      return failure(reply, 404, "NOT_FOUND", "Resource not found");
    } catch (error) {
      return requestError(reply, error);
    }
  });
}
