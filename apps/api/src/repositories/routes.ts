import type { FastifyInstance } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import type { Pool } from "pg";
import { z } from "zod";
import { GitHubError, type GitHubGateway } from "@codaryn/github";
import { WorkspaceAccessError } from "@codaryn/database";
import type { IdentityAuth } from "../identity/auth.js";
import { RepositoryService } from "./service.js";
import { receiveWebhook } from "./webhook.js";

type Auth = {
  api: Pick<
    IdentityAuth["api"],
    "getSession" | "listUserAccounts" | "getAccessToken"
  >;
};
export function registerRepositories(
  app: FastifyInstance,
  auth: Auth,
  pool: Pool,
  origin: string,
  config: { github: GitHubGateway; slug: string; webhookSecret: string } | null,
) {
  app.register(async (webhook) => {
    webhook.removeContentTypeParser("application/json");
    webhook.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_request, body, done) => done(null, body),
    );
    webhook.post(
      "/api/v1/github/webhook",
      { bodyLimit: 1024 * 1024 },
      async (request, reply) => {
        if (!config)
          return reply.code(503).send({
            error: {
              code: "GITHUB_NOT_CONFIGURED",
              message: "GitHub App is not configured",
            },
          });
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
            return reply.code(401).send({
              error: {
                code: "INVALID_SIGNATURE",
                message: "Invalid webhook signature",
              },
            });
          if (error instanceof z.ZodError || error instanceof SyntaxError)
            return reply.code(400).send({
              error: { code: "INVALID_WEBHOOK", message: "Invalid webhook" },
            });
          throw error;
        }
      },
    );
  });
  app.register(async (protectedApp) => {
    protectedApp.route({
      method: ["GET", "POST"],
      url: "/api/v1/github/*",
      handler: async (request, reply) => {
        reply.header("cache-control", "no-store");
        const session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
        });
        if (!session)
          return reply.code(401).send({
            error: {
              code: "UNAUTHENTICATED",
              message: "Sign in to continue",
            },
          });
        if (
          request.method === "POST" &&
          (request.headers.origin !== origin ||
            request.headers["x-codaryn-request"] !== "workspace")
        )
          return reply.code(403).send({
            error: {
              code: "FORBIDDEN",
              message: "Request origin is not allowed",
            },
          });
        const path = request.url.split("?")[0].slice("/api/v1/github/".length);
        if (path === "configuration" && request.method === "GET")
          return {
            enabled: !!config,
            installationUrl: config
              ? `https://github.com/apps/${encodeURIComponent(config.slug)}/installations/new`
              : null,
          };
        if (!config)
          return reply.code(503).send({
            error: {
              code: "GITHUB_NOT_CONFIGURED",
              message: "GitHub App is not configured",
            },
          });
        const service = new RepositoryService(pool, config.github);
        try {
          const input = z
            .record(z.string(), z.unknown())
            .parse(request.method === "GET" ? request.query : request.body);
          const workspace = z.uuid().parse(input.workspaceId);
          const actor = session.user.id;
          const page = z.coerce
            .number()
            .int()
            .min(1)
            .max(1000)
            .default(1)
            .parse(input.page);
          if (request.method === "GET") {
            if (path === "installations")
              return {
                installations: await service.installations(actor, workspace),
              };
            if (path === "repositories")
              return {
                repositories: await service.list(actor, workspace, page),
              };
            const id = z.uuid().parse(input.repositoryId);
            if (path === "branches")
              return {
                branches: await service.branches(actor, workspace, id, page),
              };
            if (path === "commits")
              return {
                commits: await service.commits(
                  actor,
                  workspace,
                  id,
                  z.string().min(1).max(200).parse(input.branch),
                  page,
                ),
              };
            if (path === "runs")
              return { runs: await service.runs(actor, workspace, id) };
          } else {
            if (path === "connect") {
              const accounts = await auth.api.listUserAccounts({
                headers: fromNodeHeaders(request.headers),
              });
              const account = accounts.find(
                (candidate) => candidate.providerId === "github",
              );
              if (!account)
                return reply.code(409).send({
                  error: {
                    code: "GITHUB_LOGIN_REQUIRED",
                    message:
                      "Sign in with GitHub again to connect an installation",
                  },
                });
              const token = await auth.api.getAccessToken({
                headers: fromNodeHeaders(request.headers),
                body: { accountId: account.id },
              });
              await service.connect(
                actor,
                workspace,
                z.coerce
                  .number()
                  .int()
                  .positive()
                  .safe()
                  .parse(input.installationId),
                token.accessToken,
              );
            } else if (path === "sync")
              await service.sync(
                actor,
                workspace,
                z.coerce
                  .number()
                  .int()
                  .positive()
                  .safe()
                  .parse(input.installationId),
              );
            else if (path === "disconnect")
              await service.disconnect(
                actor,
                workspace,
                z.coerce
                  .number()
                  .int()
                  .positive()
                  .safe()
                  .parse(input.installationId),
              );
            else if (path === "ingest") {
              reply.code(202);
              return await service.ingest(
                actor,
                workspace,
                z.uuid().parse(input.repositoryId),
                z.string().min(1).max(200).parse(input.ref),
              );
            } else
              return reply.code(404).send({
                error: { code: "NOT_FOUND", message: "Resource not found" },
              });
            return { success: true };
          }
          return reply.code(404).send({
            error: { code: "NOT_FOUND", message: "Resource not found" },
          });
        } catch (error) {
          if (error instanceof WorkspaceAccessError)
            return reply.code(404).send({
              error: {
                code: "NOT_FOUND",
                message: "Resource not found or access denied",
              },
            });
          if (error instanceof z.ZodError)
            return reply.code(400).send({
              error: {
                code: "INVALID_INPUT",
                message: "Check the submitted values",
              },
            });
          if (error instanceof GitHubError) {
            if (error.retryAfter)
              reply.header("retry-after", String(error.retryAfter));
            return reply.code(error.status === 429 ? 429 : 502).send({
              error: {
                code:
                  error.status === 429 ? "GITHUB_RATE_LIMIT" : "GITHUB_ACCESS",
                message: error.message,
              },
            });
          }
          throw error;
        }
      },
    });
  });
}
