import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  diagramTypeSchema,
  documentTemplateIdSchema,
  documentSearchQuerySchema,
} from "@codaryn/contracts";
import {
  requireSession,
  requestError,
  type SessionReader,
} from "../http/access.js";
import type { DiagramService } from "./service.js";

const paramsSchema = z.object({
  workspaceId: z.uuid(),
  jobId: z.uuid(),
});

const saveLayoutBodySchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  layoutConfig: z.record(z.string(), z.unknown()),
});

export function registerDiagrams(
  app: FastifyInstance,
  auth: SessionReader,
  service: DiagramService,
  origin: string,
) {
  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/atlas",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const { workspaceId, jobId } = paramsSchema.parse(request.params);
        return await service.getAtlas(session.user.id, workspaceId, jobId);
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/diagrams/:type",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema
          .extend({ type: diagramTypeSchema })
          .parse(request.params);
        return await service.getDiagram(
          session.user.id,
          params.workspaceId,
          params.jobId,
          params.type,
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.post(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/diagrams/:type/layouts",
    { bodyLimit: 65536 },
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema
          .extend({ type: diagramTypeSchema })
          .parse(request.params);
        const body = saveLayoutBodySchema.parse(request.body);
        const saved = await service.saveLayout(
          session.user.id,
          params.workspaceId,
          params.jobId,
          params.type,
          body.name,
          body.layoutConfig,
        );
        return reply.code(201).send(saved);
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/diagrams/:type/layouts",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema
          .extend({ type: diagramTypeSchema })
          .parse(request.params);
        return await service.listLayouts(
          session.user.id,
          params.workspaceId,
          params.jobId,
          params.type,
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/diagrams/:type/layouts/:layoutId",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema
          .extend({
            type: diagramTypeSchema,
            layoutId: z.uuid(),
          })
          .parse(request.params);
        return await service.getLayout(
          session.user.id,
          params.workspaceId,
          params.jobId,
          params.layoutId,
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/documents",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema.parse(request.params);
        return await service.listDocuments(
          session.user.id,
          params.workspaceId,
          params.jobId,
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/documents/search",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema.parse(request.params);
        const searchInput = z
          .object({
            q: z.string().trim().min(1).max(100),
            templateId: documentTemplateIdSchema.optional(),
            limit: z.coerce.number().int().min(1).max(50).default(20),
          })
          .parse(request.query);

        return await service.searchDocumentation(
          session.user.id,
          params.workspaceId,
          params.jobId,
          documentSearchQuerySchema.parse({
            query: searchInput.q,
            templateId: searchInput.templateId,
            limit: searchInput.limit,
          }),
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );

  app.get(
    "/api/v1/workspaces/:workspaceId/analysis/:jobId/documents/:templateId",
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const params = paramsSchema
          .extend({ templateId: documentTemplateIdSchema })
          .parse(request.params);
        return await service.getDocument(
          session.user.id,
          params.workspaceId,
          params.jobId,
          params.templateId,
        );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );
}
