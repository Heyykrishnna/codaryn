import { protectAnalysisReads } from "../http/analysis-read.js";
import type { SessionReader } from "../http/access.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { BackendService } from "./service.js";

const backendBaseQuerySchema = z.object({
  workspaceId: z.string().min(1),
  jobId: z.string().min(1),
});

const routesQuerySchema = backendBaseQuerySchema.extend({
  framework: z.string().optional(),
  method: z.string().optional(),
  search: z.string().optional(),
});

const routeDetailParamsSchema = z.object({
  routeId: z.string().min(1),
});

const controllersQuerySchema = backendBaseQuerySchema.extend({
  framework: z.string().optional(),
  search: z.string().optional(),
});

const servicesQuerySchema = backendBaseQuerySchema.extend({
  search: z.string().optional(),
});

const repositoriesQuerySchema = backendBaseQuerySchema.extend({
  ormType: z.string().optional(),
  search: z.string().optional(),
});

const middlewareQuerySchema = backendBaseQuerySchema.extend({
  kind: z.string().optional(),
  scope: z.string().optional(),
  search: z.string().optional(),
});

const requestFlowsQuerySchema = backendBaseQuerySchema.extend({
  routePath: z.string().optional(),
  httpMethod: z.string().optional(),
});

export function registerBackend(
  app: FastifyInstance,
  auth: SessionReader,
  service: BackendService,
  origin: string,
): void {
  protectAnalysisReads(
    app,
    auth,
    (actor, workspace, job) => service.authorize(actor, workspace, job),
    origin,
    "backend",
  );
  const allowOrigin = (reply: {
    header: (name: string, value: string) => void;
  }) => {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    reply.header("Vary", "Origin");
  };

  app.get("/api/v1/backend/overview", async (request, reply) => {
    allowOrigin(reply);
    const parsed = backendBaseQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const overview = await service.getOverview(
        parsed.data.workspaceId,
        parsed.data.jobId,
      );
      return reply.send(overview);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/backend/routes", async (request, reply) => {
    allowOrigin(reply);
    const parsed = routesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const routes = await service.getRoutes(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          framework: parsed.data.framework,
          method: parsed.data.method,
          search: parsed.data.search,
        },
      );
      return reply.send(routes);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/backend/routes/:routeId", async (request, reply) => {
    allowOrigin(reply);
    const queryParsed = backendBaseQuerySchema.safeParse(request.query);
    const paramsParsed = routeDetailParamsSchema.safeParse(request.params);
    if (!queryParsed.success || !paramsParsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId, jobId, and routeId required.",
        },
      });
    }

    try {
      const detail = await service.getRouteDetail(
        queryParsed.data.workspaceId,
        queryParsed.data.jobId,
        paramsParsed.data.routeId,
      );
      return reply.send(detail);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/backend/controllers", async (request, reply) => {
    allowOrigin(reply);
    const parsed = controllersQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const controllers = await service.getControllers(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          framework: parsed.data.framework,
          search: parsed.data.search,
        },
      );
      return reply.send(controllers);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/backend/services", async (request, reply) => {
    allowOrigin(reply);
    const parsed = servicesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const services = await service.getServices(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          search: parsed.data.search,
        },
      );
      return reply.send(services);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/backend/repositories", async (request, reply) => {
    allowOrigin(reply);
    const parsed = repositoriesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const repos = await service.getRepositories(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          ormType: parsed.data.ormType,
          search: parsed.data.search,
        },
      );
      return reply.send(repos);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/backend/middleware", async (request, reply) => {
    allowOrigin(reply);
    const parsed = middlewareQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const middleware = await service.getMiddleware(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          kind: parsed.data.kind,
          scope: parsed.data.scope,
          search: parsed.data.search,
        },
      );
      return reply.send(middleware);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/backend/request-flows", async (request, reply) => {
    allowOrigin(reply);
    const parsed = requestFlowsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const flows = await service.getRequestFlows(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          routePath: parsed.data.routePath,
          httpMethod: parsed.data.httpMethod,
        },
      );
      return reply.send(flows);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });
}
