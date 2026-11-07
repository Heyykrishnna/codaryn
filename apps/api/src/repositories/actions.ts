import type { FastifyRequest } from "fastify";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import type { IdentityAuth } from "../identity/auth.js";
import { RequestFailure } from "../http/access.js";
import type { RepositoryService } from "./service.js";

type Input = Record<string, unknown>;
type Context = {
  actor: string;
  workspace: string;
  input: Input;
  request: FastifyRequest;
};
const installation = (input: Input) =>
  z.coerce.number().int().positive().safe().parse(input.installationId);
const repository = (input: Input) => z.uuid().parse(input.repositoryId);
const page = (input: Input) =>
  z.coerce.number().int().min(1).max(1000).default(1).parse(input.page);
export type RepositoryAuth = {
  api: Pick<
    IdentityAuth["api"],
    "getSession" | "listUserAccounts" | "getAccessToken"
  >;
};
export function repositoryActions(
  service: RepositoryService,
  auth: RepositoryAuth,
) {
  const reads: Record<string, (context: Context) => Promise<unknown>> = {
    installations: async ({ actor, workspace }) => ({
      installations: await service.installations(actor, workspace),
    }),
    repositories: async ({ actor, workspace, input }) => ({
      repositories: await service.list(actor, workspace, page(input)),
    }),
    catalog: ({ actor, workspace, input }) =>
      service.catalog(actor, workspace, z.uuid().optional().parse(input.after)),
    branches: async ({ actor, workspace, input }) => ({
      branches: await service.branches(
        actor,
        workspace,
        repository(input),
        page(input),
      ),
    }),
    commits: async ({ actor, workspace, input }) => ({
      commits: await service.commits(
        actor,
        workspace,
        repository(input),
        z.string().min(1).max(200).parse(input.branch),
        page(input),
      ),
    }),
    runs: async ({ actor, workspace, input }) => ({
      runs: await service.runs(actor, workspace, repository(input)),
    }),
  };
  const writes: Record<string, (context: Context) => Promise<unknown>> = {
    connect: async ({ actor, workspace, input, request }) => {
      const headers = fromNodeHeaders(request.headers);
      const accounts = await auth.api.listUserAccounts({ headers });
      const account = accounts.find(
        (candidate) => candidate.providerId === "github",
      );
      if (!account)
        throw new RequestFailure(
          409,
          "GITHUB_LOGIN_REQUIRED",
          "Sign in with GitHub again to connect an installation",
        );
      const token = await auth.api.getAccessToken({
        headers,
        body: { accountId: account.id },
      });
      await service.connect(
        actor,
        workspace,
        installation(input),
        token.accessToken,
      );
    },
    sync: ({ actor, workspace, input }) =>
      service.sync(actor, workspace, installation(input)),
    disconnect: ({ actor, workspace, input }) =>
      service.disconnect(actor, workspace, installation(input)),
    ingest: ({ actor, workspace, input }) =>
      service.ingest(
        actor,
        workspace,
        repository(input),
        z.string().min(1).max(200).parse(input.ref),
      ),
  };
  return { reads, writes };
}
