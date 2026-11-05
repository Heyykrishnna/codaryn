import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  requireSession,
  requestError,
  type SessionReader,
} from "../http/access.js";
import type { ExportService } from "./service.js";

const paramsSchema = z.object({
  workspaceId: z.uuid(),
  jobId: z.uuid(),
});

export function registerExports(
  app: FastifyInstance,
  auth: SessionReader,
  service: ExportService,
  origin: string,
) {
  app.post(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/exports",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema.parse(request.params);
        const scheduled = await service.scheduleExport(
          session.user.id,
          params.workspaceId,
          params.jobId,
          request.body,
        );
        return reply.code(202).send(scheduled);
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/exports/:exportId",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema
          .extend({ exportId: z.uuid() })
          .parse(request.params);
        return await service.getExportStatus(
          session.user.id,
          params.workspaceId,
          params.jobId,
          params.exportId,
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/exports/:exportId/download",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema
          .extend({ exportId: z.uuid() })
          .parse(request.params);
        const artifact = await service.getArtifactPayload(
          session.user.id,
          params.workspaceId,
          params.jobId,
          params.exportId,
        );

        return reply
          .header("Content-Type", artifact.content_type)
          .header(
            "Content-Disposition",
            `attachment; filename="${artifact.filename}"`,
          )
          .header("ETag", `"${artifact.hash}"`)
          .header("Content-Length", String(artifact.size))
          .send(artifact.payload);
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );
}
