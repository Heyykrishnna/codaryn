import { protectAnalysisReads } from "../http/analysis-read.js";
import type { SessionReader } from "../http/access.js";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { FrontendService } from "./service.js";

const frontendBaseQuerySchema = z.object({
  workspaceId: z.string().min(1),
  jobId: z.string().min(1),
});

const componentsQuerySchema = frontendBaseQuerySchema.extend({
  search: z.string().optional(),
  kind: z.string().optional(),
});

const componentDetailQuerySchema = frontendBaseQuerySchema.extend({
  componentId: z.string().min(1),
});

const routesQuerySchema = frontendBaseQuerySchema.extend({
  framework: z.string().optional(),
});

const hooksQuerySchema = frontendBaseQuerySchema.extend({
  componentId: z.string().optional(),
  kind: z.string().optional(),
});

const stateQuerySchema = frontendBaseQuerySchema.extend({
  componentId: z.string().optional(),
  kind: z.string().optional(),
});

const apiClientsQuerySchema = frontendBaseQuerySchema.extend({
  componentId: z.string().optional(),
  clientType: z.string().optional(),
});

export function registerFrontend(
  app: FastifyInstance,
  auth: SessionReader,
  service: FrontendService,
  origin: string,
): void {
  protectAnalysisReads(
    app,
    auth,
    (actor, workspace, job) => service.authorize(actor, workspace, job),
    origin,
    "frontend",
  );
  const allowOrigin = (reply: {
    header: (name: string, value: string) => void;
  }) => {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    reply.header("Vary", "Origin");
  };

  app.get("/api/v1/frontend/overview", async (request, reply) => {
    allowOrigin(reply);
    const parsed = frontendBaseQuerySchema.safeParse(request.query);
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

  app.get("/api/v1/frontend/components", async (request, reply) => {
    allowOrigin(reply);
    const parsed = componentsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const components = await service.getComponents(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          search: parsed.data.search,
          kind: parsed.data.kind,
        },
      );
      return reply.send(components);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/frontend/component", async (request, reply) => {
    allowOrigin(reply);
    const parsed = componentDetailQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId, jobId, and componentId required.",
        },
      });
    }

    try {
      const detail = await service.getComponentDetail(
        parsed.data.workspaceId,
        parsed.data.jobId,
        parsed.data.componentId,
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

  app.get("/api/v1/frontend/routes", async (request, reply) => {
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

  app.get("/api/v1/frontend/hooks", async (request, reply) => {
    allowOrigin(reply);
    const parsed = hooksQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const hooks = await service.getHooks(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          componentId: parsed.data.componentId,
          kind: parsed.data.kind,
        },
      );
      return reply.send(hooks);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/frontend/contexts", async (request, reply) => {
    allowOrigin(reply);
    const parsed = frontendBaseQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const contexts = await service.getContexts(
        parsed.data.workspaceId,
        parsed.data.jobId,
      );
      return reply.send(contexts);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/frontend/state", async (request, reply) => {
    allowOrigin(reply);
    const parsed = stateQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const state = await service.getState(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          componentId: parsed.data.componentId,
          kind: parsed.data.kind,
        },
      );
      return reply.send(state);
    } catch {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: "Resource not found or access denied.",
        },
      });
    }
  });

  app.get("/api/v1/frontend/api-clients", async (request, reply) => {
    allowOrigin(reply);
    const parsed = apiClientsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const apiCalls = await service.getApiClients(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          componentId: parsed.data.componentId,
          clientType: parsed.data.clientType,
        },
      );
      return reply.send(apiCalls);
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
