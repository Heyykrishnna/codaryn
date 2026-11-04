import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  requireSession,
  requestError,
  failure,
  type SessionReader,
} from "../http/access.js";
import type { SchemaService } from "./service.js";
const querySchema = z.object({
  workspaceId: z.uuid(),
  snapshotId: z.uuid().optional(),
  jobId: z.uuid().optional(),
  otherId: z.uuid().optional(),
  tableId: z.string().min(1).max(512).optional(),
  columnId: z.string().min(1).max(512).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  search: z.string().max(100).default(""),
  adapter: z.enum(["sql", "prisma", "drizzle", ""]).default(""),
  format: z.enum(["json", "svg", "markdown"]).default("json"),
  layout: z.enum(["er", "compact"]).default("er"),
});
export function registerSchema(
  app: FastifyInstance,
  auth: SessionReader,
  service: SchemaService,
  origin: string,
) {
  app.post(
    "/api/v1/schema/request",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const input = z
          .strictObject({
            workspaceId: z.uuid(),
            jobId: z.uuid(),
            inferRelations: z.boolean().default(false),
          })
          .parse(request.body);
        return reply
          .code(202)
          .send(
            await service.request(
              session.user.id,
              input.workspaceId,
              input.jobId,
              input.inferRelations,
            ),
          );
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );
  app.get("/api/v1/schema/:action", async (request, reply) => {
    const session = await requireSession(auth, request, reply, origin);
    if (!session) return reply;
    try {
      const input = querySchema.parse(request.query);
      const { action } = z.object({ action: z.string() }).parse(request.params);
      const actor = session.user.id,
        workspace = input.workspaceId;
      if (action === "snapshots")
        return await service.list(actor, workspace, input.page, input.jobId);
      const snapshotId = z.uuid().parse(input.snapshotId);
      if (action === "diagram")
        return await service.diagram(
          actor,
          workspace,
          snapshotId,
          input.search,
          input.adapter,
        );
      if (action === "overview")
        return await service.overview(actor, workspace, snapshotId);
      if (
        action === "tables" ||
        action === "relations" ||
        action === "lineage" ||
        action === "columns" ||
        action === "constraints" ||
        action === "enums"
      )
        return await service.objects(
          actor,
          workspace,
          snapshotId,
          action,
          input.page,
          input.search,
          input.adapter,
          input.tableId,
        );
      if (action === "table" || action === "column")
        return await service.table(
          actor,
          workspace,
          snapshotId,
          z.string().min(1).parse(input.tableId),
          action === "column"
            ? z.string().min(1).parse(input.columnId)
            : undefined,
        );
      if (action === "compare")
        return await service.compare(
          actor,
          workspace,
          snapshotId,
          z.uuid().parse(input.otherId),
        );
      if (action === "export") {
        const result = await service.export(
          actor,
          workspace,
          snapshotId,
          input.format,
          input.layout,
        );
        return reply
          .header("content-type", `${result.contentType}; charset=utf-8`)
          .header(
            "content-disposition",
            `attachment; filename="schema-${snapshotId}.${result.extension}"`,
          )
          .header("x-content-type-options", "nosniff")
          .header("content-security-policy", "default-src 'none'; sandbox")
          .send(result.content);
      }
      return failure(reply, 404, "NOT_FOUND", "Resource not found");
    } catch (error) {
      return requestError(reply, error);
    }
  });
}
