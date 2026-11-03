import type { FastifyRequest, FastifyReply } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import { WorkspaceAccessError } from "@codaryn/database";
import { GitHubError } from "@codaryn/github";
import type { IdentityAuth } from "../identity/auth.js";

export function failure(
  reply: FastifyReply,
  status: number,
  code: string,
  message: string,
) {
  return reply.code(status).send({ error: { code, message } });
}
export class RequestFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
export async function requireSession(
  auth: { api: Pick<IdentityAuth["api"], "getSession"> },
  request: FastifyRequest,
  reply: FastifyReply,
  origin: string,
) {
  reply.header("cache-control", "no-store");
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });
  if (!session) {
    failure(reply, 401, "UNAUTHENTICATED", "Sign in to continue");
    return null;
  }
  if (
    !["GET", "HEAD"].includes(request.method) &&
    (request.headers.origin !== origin ||
      request.headers["x-codaryn-request"] !== "workspace")
  ) {
    failure(reply, 403, "FORBIDDEN", "Request origin is not allowed");
    return null;
  }
  return session;
}
export function requestError(reply: FastifyReply, error: unknown) {
  if (error instanceof WorkspaceAccessError)
    return failure(
      reply,
      404,
      "NOT_FOUND",
      "Resource not found or access denied",
    );
  if (error instanceof z.ZodError)
    return failure(reply, 400, "INVALID_INPUT", "Check the submitted values");
  if (error instanceof RequestFailure)
    return failure(reply, error.status, error.code, error.message);
  if (error instanceof GitHubError) {
    if (error.retryAfter) reply.header("retry-after", String(error.retryAfter));
    const limited = error.status === 429;
    return failure(
      reply,
      limited ? 429 : 502,
      limited ? "GITHUB_RATE_LIMIT" : "GITHUB_ACCESS",
      error.message,
    );
  }
  throw error;
}
