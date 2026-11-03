import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  analyzerRegistry,
  registryVersion,
  StudioConfigurationError,
} from "@codaryn/contracts";
import {
  requireSession,
  requestError,
  failure,
  type SessionReader,
} from "../http/access.js";
import type { StudioService } from "./service.js";

type Input = Record<string, unknown>;
const id = (value: unknown) => z.uuid().parse(value);
const revision = (value: unknown) => z.number().int().positive().parse(value);
const page = (value: unknown) =>
  z.coerce.number().int().min(1).max(1000).default(1).parse(value);
export function registerStudio(
  app: FastifyInstance,
  auth: SessionReader,
  service: StudioService,
  origin: string,
) {
  const reads: Record<
    string,
    (actor: string, workspace: string, input: Input) => Promise<unknown>
  > = {
    registry: () =>
      Promise.resolve({
        version: registryVersion,
        analyzers: analyzerRegistry,
      }),
    profiles: (actor, workspace, input) =>
      service.profiles(actor, workspace, page(input.page)),
    manifests: (actor, workspace, input) =>
      service.history(actor, workspace, page(input.page)),
  };
  const writes: typeof reads = {
    validate: (actor, workspace, input) =>
      service.validate(actor, workspace, input.configuration),
    save: (actor, workspace, input) =>
      service.save(
        actor,
        workspace,
        z.string().trim().min(1).max(100).parse(input.name),
        input.configuration,
        input.id === undefined ? undefined : id(input.id),
        input.id === undefined ? undefined : revision(input.revision),
      ),
    delete: (actor, workspace, input) =>
      service.remove(actor, workspace, id(input.id), revision(input.revision)),
    start: (actor, workspace, input) =>
      service.start(
        actor,
        workspace,
        id(input.repositoryId),
        z.string().trim().min(1).max(200).parse(input.ref),
        input.configuration,
      ),
  };
  app.route({
    method: ["GET", "POST"],
    url: "/api/v1/studio/:action",
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
        if (!Object.hasOwn(table, action))
          return failure(reply, 404, "NOT_FOUND", "Resource not found");
        const result = await table[action](
          session.user.id,
          id(input.workspaceId),
          input,
        );
        if (action === "start") reply.code(201);
        return result;
      } catch (error) {
        if (error instanceof StudioConfigurationError)
          return failure(reply, 400, "INVALID_CONFIGURATION", error.message);
        if (error instanceof z.ZodError)
          return failure(
            reply,
            400,
            "INVALID_INPUT",
            error.issues
              .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
              .join("; ")
              .slice(0, 1000),
          );
        return requestError(reply, error);
      }
    },
  });
}
