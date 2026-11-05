import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { findingSeveritySchema, findingStateSchema } from "@codaryn/contracts";
import {
  requireSession,
  requestError,
  failure,
  type SessionReader,
} from "../http/access.js";
import { reviewInputSchema, type QualityService } from "./service.js";
const querySchema = z.object({
  workspaceId: z.uuid(),
  snapshotId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  search: z.string().max(100).default(""),
  objectId: z.string().min(1).max(1024).optional(),
  severity: z.union([findingSeveritySchema, z.literal("")]).default(""),
  state: z.union([findingStateSchema, z.literal("")]).default(""),
  tool: z.enum(["", "builtin", "semgrep", "osv"]).default(""),
  category: z
    .enum(["", "secret", "dangerous-code", "configuration", "dependency"])
    .default(""),
});
export function registerQuality(
  app: FastifyInstance,
  auth: SessionReader,
  service: QualityService,
  origin: string,
) {
  app.post(
    "/api/v1/quality/request",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const body = z
          .strictObject({
            workspaceId: z.uuid(),
            jobId: z.uuid(),
            externalScans: z.boolean().default(false),
          })
          .parse(request.body);
        return reply
          .code(202)
          .send(
            await service.request(
              session.user.id,
              body.workspaceId,
              body.jobId,
              body.externalScans,
            ),
          );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );
  app.post(
    "/api/v1/quality/review",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const body = z
          .strictObject({
            workspaceId: z.uuid(),
            snapshotId: z.uuid(),
            ...reviewInputSchema.shape,
          })
          .parse(request.body);
        return await service.review(
          session.user.id,
          body.workspaceId,
          body.snapshotId,
          body,
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );
  app.get("/api/v1/quality/:action", async (request, reply) => {
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
        action === "resources" ||
        action === "tests" ||
        action === "coverage" ||
        action === "dependencies" ||
        action === "environment" ||
        action === "findings"
      )
        return await service.objects(actor, q.workspaceId, id, {
          ...q,
          kind: action,
        });
      if (action === "resource" || action === "test" || action === "finding")
        return await service.inspect(actor, q.workspaceId, id, {
          kind: action,
          objectId: z.string().min(1).parse(q.objectId),
        });
      if (action === "audit")
        return await service.audit(actor, q.workspaceId, id, q.page);
      return failure(reply, 404, "NOT_FOUND", "Resource not found");
    } catch (error) {
      return requestError(reply, error);
    }
  });
}
