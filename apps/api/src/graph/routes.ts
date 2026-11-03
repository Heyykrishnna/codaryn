import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { GraphService } from "./service.js";

const graphQuerySchema = z.object({
  workspaceId: z.string().min(1),
  jobId: z.string().min(1),
  search: z.string().optional(),
  kind: z.string().optional(),
  resolution: z.string().optional(),
});

const neighborhoodQuerySchema = z.object({
  workspaceId: z.string().min(1),
  jobId: z.string().min(1),
  nodeId: z.string().min(1),
  depth: z.coerce.number().int().min(1).max(5).default(1),
  direction: z.enum(["incoming", "outgoing", "both"]).default("both"),
});

export function registerGraph(
  app: FastifyInstance,
  auth: unknown,
  service: GraphService,
  origin: string,
): void {
  const allowOrigin = (reply: {
    header: (name: string, value: string) => void;
  }) => {
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    reply.header("Vary", "Origin");
  };

  app.get("/api/v1/graph/snapshot", async (request, reply) => {
    allowOrigin(reply);
    const parsed = graphQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const snapshot = await service.getSnapshot(
        parsed.data.workspaceId,
        parsed.data.jobId,
        {
          search: parsed.data.search,
          kind: parsed.data.kind,
          resolution: parsed.data.resolution,
        },
      );
      return reply.send(snapshot);
    } catch (err) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: err instanceof Error ? err.message : "Graph not found.",
        },
      });
    }
  });

  app.get("/api/v1/graph/neighborhood", async (request, reply) => {
    allowOrigin(reply);
    const parsed = neighborhoodQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId, jobId, and nodeId required.",
        },
      });
    }

    try {
      const result = await service.getNeighborhood(
        parsed.data.workspaceId,
        parsed.data.jobId,
        parsed.data.nodeId,
        parsed.data.depth,
        parsed.data.direction,
      );
      return reply.send(result);
    } catch (err) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message:
            err instanceof Error ? err.message : "Neighborhood not found.",
        },
      });
    }
  });

  app.get("/api/v1/graph/cycles", async (request, reply) => {
    allowOrigin(reply);
    const parsed = graphQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const cycles = await service.getCycles(
        parsed.data.workspaceId,
        parsed.data.jobId,
      );
      return reply.send(cycles);
    } catch (err) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: err instanceof Error ? err.message : "Cycles not found.",
        },
      });
    }
  });

  app.get("/api/v1/graph/unresolved", async (request, reply) => {
    allowOrigin(reply);
    const parsed = graphQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const unresolved = await service.getUnresolvedReferences(
        parsed.data.workspaceId,
        parsed.data.jobId,
      );
      return reply.send(unresolved);
    } catch (err) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message:
            err instanceof Error
              ? err.message
              : "Unresolved references not found.",
        },
      });
    }
  });

  app.get("/api/v1/graph/metrics", async (request, reply) => {
    allowOrigin(reply);
    const parsed = graphQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "INVALID_REQUEST",
          message: "Valid workspaceId and jobId required.",
        },
      });
    }

    try {
      const metrics = await service.getMetrics(
        parsed.data.workspaceId,
        parsed.data.jobId,
      );
      return reply.send(metrics);
    } catch (err) {
      return reply.status(404).send({
        error: {
          code: "NOT_FOUND",
          message: err instanceof Error ? err.message : "Metrics not found.",
        },
      });
    }
  });
}
