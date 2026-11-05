import { branchRefSchema } from "@codaryn/contracts";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  requireSession,
  requestError,
  failure,
  type SessionReader,
} from "../http/access.js";
import type { ComparisonService } from "./service.js";
export function registerComparison(
  app: FastifyInstance,
  auth: SessionReader,
  service: ComparisonService,
  origin: string,
) {
  app.post(
    "/api/v1/comparison/:action",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const { action } = z
            .object({ action: z.enum(["request", "compare", "policy"]) })
            .parse(request.params),
          base = { workspaceId: z.uuid() };
        if (action === "request") {
          const b = z
            .strictObject({
              ...base,
              jobId: z.uuid(),
              baseId: z.uuid().nullable().default(null),
              verifyFull: z.boolean().default(false),
            })
            .parse(request.body);
          return reply
            .code(202)
            .send(
              await service.request(
                session.user.id,
                b.workspaceId,
                b.jobId,
                b.baseId,
                b.verifyFull,
              ),
            );
        }
        if (action === "compare") {
          const b = z
            .strictObject({ ...base, fromId: z.uuid(), toId: z.uuid() })
            .parse(request.body);
          return await service.compare(
            session.user.id,
            b.workspaceId,
            b.fromId,
            b.toId,
          );
        }
        const b = z
          .strictObject({
            ...base,
            jobId: z.uuid(),
            ref: branchRefSchema,
            enabled: z.boolean(),
          })
          .parse(request.body);
        return await service.policy(
          session.user.id,
          b.workspaceId,
          b.jobId,
          b.ref,
          b.enabled,
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );
  app.get("/api/v1/comparison/:action", async (request, reply) => {
    const session = await requireSession(auth, request, reply, origin);
    if (!session) return reply;
    try {
      const q = z
          .object({
            workspaceId: z.uuid(),
            snapshotId: z.uuid().optional(),
            comparisonId: z.uuid().optional(),
            page: z.coerce.number().int().min(1).max(1000).default(1),
            search: z.string().max(100).default(""),
            view: z.enum(["changes", "schema", "impact"]).default("changes"),
            kind: z.enum(["", "added", "removed", "changed"]).default(""),
          })
          .parse(request.query),
        { action } = z.object({ action: z.string() }).parse(request.params),
        actor = session.user.id;
      if (action === "jobs") return await service.jobs(actor, q.workspaceId);
      if (action === "versions")
        return await service.list(actor, q.workspaceId, q.page);
      if (action === "overview")
        return await service.overview(
          actor,
          q.workspaceId,
          z.uuid().parse(q.snapshotId),
        );
      if (action === "history")
        return await service.comparisons(actor, q.workspaceId, q.page);
      if (action === "detail")
        return await service.detail(
          actor,
          q.workspaceId,
          z.uuid().parse(q.comparisonId),
          q,
        );
      if (action === "policies")
        return await service.policies(actor, q.workspaceId);
      return failure(reply, 404, "NOT_FOUND", "Resource not found");
    } catch (error) {
      return requestError(reply, error);
    }
  });
}
