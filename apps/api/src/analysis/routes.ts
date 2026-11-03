import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  requireSession,
  requestError,
  failure,
  type SessionReader,
} from "../http/access.js";
import { AnalysisService, AnalysisServiceError } from "./service.js";

type Input = Record<string, unknown>;
const id = (value: unknown) => z.uuid().parse(value);

export function registerAnalysis(
  app: FastifyInstance,
  auth: SessionReader,
  service: AnalysisService,
  origin: string,
) {
  const reads: Record<
    string,
    (actor: string, workspace: string, input: Input) => Promise<unknown>
  > = {
    job: (actor, workspace, input) =>
      service.getJob(actor, workspace, id(input.jobId)),
    inventory: (actor, workspace, input) =>
      service.getFileInventory(actor, workspace, id(input.jobId)),
    symbols: (actor, workspace, input) =>
      service.getSymbols(
        actor,
        workspace,
        id(input.jobId),
        typeof input.kind === "string" ? input.kind : undefined,
      ),
    diagnostics: (actor, workspace, input) =>
      service.getDiagnostics(actor, workspace, id(input.jobId)),
  };

  const writes: typeof reads = {
    start: (actor, workspace, input) =>
      service.startJob(
        actor,
        workspace,
        id(input.manifestId),
        id(input.repositoryId),
        z.string().trim().min(1).max(200).parse(input.ref),
      ),
    cancel: (actor, workspace, input) =>
      service.cancelJob(actor, workspace, id(input.jobId)),
    retry: (actor, workspace, input) =>
      service.retryJob(actor, workspace, id(input.jobId)),
  };

  app.route({
    method: ["GET", "POST"],
    url: "/api/v1/analysis/:action",
    bodyLimit: 65536,
    handler: async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;

      try {
        const input = z
          .record(z.string(), z.unknown())
          .parse(request.method === "GET" ? request.query : request.body);
        const { action } = z
          .object({ action: z.string() })
          .parse(request.params);

        const table = request.method === "GET" ? reads : writes;
        if (!Object.hasOwn(table, action)) {
          return failure(reply, 404, "NOT_FOUND", "Action not found");
        }

        const workspaceId = id(input.workspaceId);
        const result = await table[action](session.user.id, workspaceId, input);

        if (action === "start") reply.code(201);
        return result;
      } catch (error) {
        if (error instanceof AnalysisServiceError) {
          return failure(reply, error.statusCode, error.code, error.message);
        }
        if (error instanceof z.ZodError) {
          return failure(
            reply,
            400,
            "INVALID_INPUT",
            error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; ")
              .slice(0, 1000),
          );
        }
        return requestError(reply, error);
      }
    },
  });
}
