import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import type { GitHubGateway } from "@codaryn/github";
import { requireSession, failure, requestError } from "../http/access.js";
import { repositoryActions, type RepositoryAuth } from "./actions.js";
import { RepositoryService } from "./service.js";
import { receiveWebhook } from "./webhook.js";

type Configuration = {
  github: GitHubGateway;
  slug: string;
  webhookSecret: string;
};
function registerWebhook(
  app: FastifyInstance,
  pool: Pool,
  config: Configuration | null,
) {
  app.register((webhook, _options, done) => {
    webhook.removeContentTypeParser("application/json");
    webhook.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, parsed) => parsed(null, body),
    );
    webhook.post(
      "/api/v1/github/webhook",
      { bodyLimit: 1024 * 1024 },
      async (request, reply) => {
        if (!config)
          return failure(
            reply,
            503,
            "GITHUB_NOT_CONFIGURED",
            "GitHub App is not configured",
          );
        try {
          return await receiveWebhook(
            pool,
            config.webhookSecret,
            z.instanceof(Buffer).parse(request.body),
            z.string().parse(request.headers["x-hub-signature-256"]),
            z.string().parse(request.headers["x-github-event"]),
            z.string().parse(request.headers["x-github-delivery"]),
          );
        } catch (error) {
          if (error instanceof Error && error.message === "INVALID_SIGNATURE")
            return failure(
              reply,
              401,
              "INVALID_SIGNATURE",
              "Invalid webhook signature",
            );
          if (error instanceof z.ZodError || error instanceof SyntaxError)
            if (error instanceof Error && error.message === "WEBHOOK_CAPACITY")
              return failure(
                reply,
                503,
                "WEBHOOK_CAPACITY",
                "Push queue is at capacity; retry delivery later",
              );
          return failure(reply, 400, "INVALID_WEBHOOK", "Invalid webhook");
          throw error;
        }
      },
    );
    done();
  });
}
export function registerRepositories(
  app: FastifyInstance,
  auth: RepositoryAuth,
  pool: Pool,
  origin: string,
  config: Configuration | null,
) {
  registerWebhook(app, pool, config);
  const actions = config
    ? repositoryActions(new RepositoryService(pool, config.github), auth)
    : null;
  app.route({
    method: ["GET", "POST"],
    url: "/api/v1/github/*",
    handler: async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      const path = request.url.split("?")[0].slice("/api/v1/github/".length);
      const read = request.method === "GET";
      if (read && path === "configuration")
        return {
          enabled: !!config,
          installationUrl: config
            ? `https://github.com/apps/${encodeURIComponent(config.slug)}/installations/new`
            : null,
        };
      if (!actions)
        return failure(
          reply,
          503,
          "GITHUB_NOT_CONFIGURED",
          "GitHub App is not configured",
        );
      try {
        const input = z
          .record(z.string(), z.unknown())
          .parse(read ? request.query : request.body);
        const workspace = z.uuid().parse(input.workspaceId);
        const table = read ? actions.reads : actions.writes;
        const action = Object.hasOwn(table, path) ? table[path] : undefined;
        if (!action)
          return failure(reply, 404, "NOT_FOUND", "Resource not found");
        const result = await action({
          actor: session.user.id,
          workspace,
          input,
          request,
        });
        if (!read && path === "ingest") reply.code(202);
        return result ?? { success: true };
      } catch (error) {
        return requestError(reply, error);
      }
    },
  });
}
