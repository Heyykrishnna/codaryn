import { createHash, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { RequestBudget, requestGroup } from "./ingress.js";
const sample = z.strictObject({
  name: z.enum(["LCP", "INP", "CLS", "client-error"]),
  value: z.number().finite().min(0).max(3600000),
});
export function registerOperations(
  app: FastifyInstance,
  options: { pool?: Pool; secret?: string; token?: string; origin?: string },
) {
  const budget =
      options.pool && options.secret
        ? new RequestBudget(options.pool, options.secret)
        : null,
    started = new WeakMap<FastifyRequest, number>(),
    requests = new Map<
      string,
      { count: number; errors: number; durationBuckets: number[] }
    >(),
    client = new Map<string, { count: number; sum: number; max: number }>();
  app.addHook("onRequest", async (request, reply) => {
    started.set(request, performance.now());
    reply
      .header("x-content-type-options", "nosniff")
      .header("referrer-policy", "no-referrer")
      .header("cache-control", "no-store");
    if (
      ["/api/v1/health", "/api/v1/ready"].includes(request.url.split("?")[0]) ||
      !budget
    )
      return;
    try {
      const group = requestGroup(request.url),
        result = await budget.consume(
          request.ip,
          group,
          group === "identity" ? 60 : 240,
        );
      if (!result.allowed)
        return reply
          .header("retry-after", String(result.retryAfter))
          .code(429)
          .send({
            error: {
              code: "RATE_LIMITED",
              message: "Wait before retrying this request",
            },
          });
    } catch {
      return reply.code(503).send({
        error: {
          code: "UNAVAILABLE",
          message: "Service temporarily unavailable",
        },
      });
    }
  });
  app.addHook("onResponse", async (request, reply) => {
    const key = requestGroup(request.url),
      elapsed = performance.now() - (started.get(request) ?? performance.now()),
      row = requests.get(key) ?? {
        count: 0,
        errors: 0,
        durationBuckets: [0, 0, 0, 0, 0],
      };
    row.count++;
    if (reply.statusCode >= 500) row.errors++;
    const bucket = [25, 100, 500, 2000].findIndex((bound) => elapsed <= bound);
    row.durationBuckets[bucket < 0 ? 4 : bucket]++;
    requests.set(key, row);
    if (reply.statusCode >= 500)
      app.log.error(
        { requestId: request.id, group: key, status: reply.statusCode },
        "Operational request failure",
      );
  });
  app.get("/api/v1/ready", async (_request, reply) => {
    try {
      if (!options.pool) throw new Error("Unavailable");
      await options.pool.query("SELECT 1");
      return { status: "ready" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });
  app.get("/api/v1/operations/metrics", async (request, reply) => {
    const expected = options.token,
      authorization = request.headers.authorization;
    if (
      !expected ||
      !authorization ||
      !timingSafeEqual(
        createHash("sha256").update(authorization).digest(),
        createHash("sha256").update(`Bearer ${expected}`).digest(),
      )
    )
      return reply.code(404).send({
        error: { code: "NOT_FOUND", message: "Resource unavailable" },
      });
    return {
      scope: "instance",
      uptimeSeconds: Math.floor(process.uptime()),
      memory: process.memoryUsage(),
      durationBoundsMs: [25, 100, 500, 2000],
      requests: Object.fromEntries(requests),
      client: Object.fromEntries(client),
      database: {
        total: options.pool?.totalCount ?? 0,
        idle: options.pool?.idleCount ?? 0,
        waiting: options.pool?.waitingCount ?? 0,
      },
    };
  });
  app.post(
    "/api/v1/operations/client",
    { bodyLimit: 512 },
    async (request, reply) => {
      if (!options.origin || request.headers.origin !== options.origin)
        return reply.code(403).send({
          error: {
            code: "FORBIDDEN",
            message: "Request origin is not allowed",
          },
        });
      const parsed = sample.safeParse(request.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: { code: "INVALID_INPUT", message: "Invalid measurement" },
        });
      const row = client.get(parsed.data.name) ?? { count: 0, sum: 0, max: 0 };
      row.count++;
      row.sum += parsed.data.value;
      row.max = Math.max(row.max, parsed.data.value);
      client.set(parsed.data.name, row);
      return reply.code(204).send();
    },
  );
}
