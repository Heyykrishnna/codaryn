import { request } from "@octokit/request";
import { createAppAuth } from "@octokit/auth-app";
import { z } from "zod";

const shaSchema = z.string().regex(/^[a-f0-9]{40}$/);
export const repositorySchema = z.object({
  id: z.number().int().positive().safe(),
  name: z.string(),
  full_name: z.string().regex(/^[^/]+\/[^/]+$/),
  private: z.boolean(),
  default_branch: z.string(),
  owner: z.object({ login: z.string() }),
});
export type Repository = z.infer<typeof repositorySchema>;
export class GitHubError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter: number | null = null,
  ) {
    super(
      status === 429
        ? "GitHub rate limit reached"
        : status === 404 || status === 403
          ? "GitHub access is unavailable"
          : "GitHub request failed",
    );
  }
}
export interface GitHubGateway {
  verifyInstallation(installationId: number, userToken: string): Promise<void>;
  repositories(installationId: number): Promise<Repository[]>;
  branches(
    installationId: number,
    fullName: string,
    page: number,
  ): Promise<{ name: string; sha: string }[]>;
  commits(
    installationId: number,
    fullName: string,
    branch: string,
    page: number,
  ): Promise<{ sha: string; message: string }[]>;
  resolve(
    installationId: number,
    fullName: string,
    ref: string,
  ): Promise<string>;
  archive(
    installationId: number,
    fullName: string,
    sha: string,
  ): Promise<Buffer>;
}
export class GitHubClient implements GitHubGateway {
  private readonly auth;
  constructor(
    config: { appId: string; privateKey: string },
    private readonly transport: typeof fetch = fetch,
  ) {
    this.auth = createAppAuth({
      appId: config.appId,
      privateKey: config.privateKey,
      request: request.defaults({
        request: { fetch: transport, timeout: 20000 },
      }),
    });
  }
  private async response(path: string, token: string, method = "GET") {
    const response = await this.transport(`https://api.github.com${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2026-03-10",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok && response.status !== 302) {
      const limited =
        response.status === 429 ||
        (response.status === 403 &&
          (response.headers.get("x-ratelimit-remaining") === "0" ||
            response.headers.has("retry-after")));
      const retry = Number(response.headers.get("retry-after") ?? 60);
      throw new GitHubError(
        limited ? 429 : response.status,
        limited
          ? Math.min(3600, Math.max(1, Number.isFinite(retry) ? retry : 60))
          : null,
      );
    }
    return response;
  }
  private async token(installationId: number, refresh = false) {
    try {
      return (
        await this.auth({
          type: "installation",
          installationId,
          refresh,
          permissions: { contents: "read", metadata: "read" },
        })
      ).token;
    } catch (error) {
      const failure = z
        .object({
          status: z.number(),
          response: z
            .object({ headers: z.record(z.string(), z.unknown()) })
            .optional(),
        })
        .safeParse(error);
      if (failure.success) {
        const headers = failure.data.response?.headers;
        const limited =
          failure.data.status === 429 ||
          (failure.data.status === 403 &&
            (headers?.["x-ratelimit-remaining"] === "0" ||
              headers?.["retry-after"] !== undefined));
        throw new GitHubError(
          limited ? 429 : failure.data.status,
          limited ? 60 : null,
        );
      }
      throw new GitHubError(502);
    }
  }
  private async installed(path: string, id: number): Promise<Response> {
    try {
      return await this.response(path, await this.token(id));
    } catch (error) {
      if (error instanceof GitHubError && error.status === 401)
        return this.response(path, await this.token(id, true));
      throw error;
    }
  }
  private repoPath(name: string) {
    const [owner, repo] = z
      .string()
      .regex(/^[^/]+\/[^/]+$/)
      .parse(name)
      .split("/");
    return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  }
  async verifyInstallation(id: number, userToken: string) {
    const appToken = (await this.auth({ type: "app" })).token;
    const installation = z
      .object({
        account: z.object({
          id: z.number(),
          login: z.string(),
          type: z.enum(["User", "Organization"]),
        }),
        permissions: z.object({ contents: z.enum(["read", "write"]) }),
        suspended_at: z.unknown().nullable(),
      })
      .parse(
        await (
          await this.response(`/app/installations/${id}`, appToken)
        ).json(),
      );
    if (installation.suspended_at !== null) throw new GitHubError(403);
    const user = z
      .object({ id: z.number(), login: z.string() })
      .parse(await (await this.response("/user", userToken)).json());
    if (installation.account.type === "User") {
      if (installation.account.id !== user.id) throw new GitHubError(403);
    } else {
      const membership = z
        .object({ state: z.literal("active"), role: z.literal("admin") })
        .safeParse(
          await (
            await this.response(
              `/orgs/${encodeURIComponent(installation.account.login)}/memberships/${encodeURIComponent(user.login)}`,
              userToken,
            )
          ).json(),
        );
      if (!membership.success) throw new GitHubError(403);
    }
  }
  async repositories(id: number) {
    const repositories: Repository[] = [];
    for (let page = 1; page <= 51; page++) {
      const result = z
        .object({ repositories: z.array(repositorySchema) })
        .parse(
          await (
            await this.installed(
              `/installation/repositories?per_page=100&page=${page}`,
              id,
            )
          ).json(),
        );
      repositories.push(...result.repositories);
      if (repositories.length > 5000)
        throw new Error(
          "Installation exceeds the supported 5000 repository limit",
        );
      if (result.repositories.length < 100) return repositories;
    }
    throw new Error("Installation exceeds the supported 5000 repository limit");
  }
  async branches(id: number, name: string, page: number) {
    return z
      .array(
        z.object({ name: z.string(), commit: z.object({ sha: shaSchema }) }),
      )
      .parse(
        await (
          await this.installed(
            `${this.repoPath(name)}/branches?per_page=50&page=${page}`,
            id,
          )
        ).json(),
      )
      .map((branch) => ({ name: branch.name, sha: branch.commit.sha }));
  }
  async commits(id: number, name: string, branch: string, page: number) {
    return z
      .array(
        z.object({ sha: shaSchema, commit: z.object({ message: z.string() }) }),
      )
      .parse(
        await (
          await this.installed(
            `${this.repoPath(name)}/commits?sha=${encodeURIComponent(branch)}&per_page=50&page=${page}`,
            id,
          )
        ).json(),
      )
      .map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message.slice(0, 500),
      }));
  }
  async resolve(id: number, name: string, ref: string) {
    return z
      .object({ sha: shaSchema })
      .parse(
        await (
          await this.installed(
            `${this.repoPath(name)}/commits/${encodeURIComponent(ref)}`,
            id,
          )
        ).json(),
      ).sha;
  }
  async archive(id: number, name: string, sha: string) {
    shaSchema.parse(sha);
    const response = await this.installed(
      `${this.repoPath(name)}/tarball/${sha}`,
      id,
    );
    const location = response.headers.get("location");
    if (response.status !== 302 || !location) throw new GitHubError(502);
    const url = new URL(location);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "codeload.github.com" ||
      url.port ||
      url.username ||
      url.password
    )
      throw new GitHubError(502);
    const download = await this.transport(url, {
      redirect: "error",
      signal: AbortSignal.timeout(60000),
    });
    if (!download.ok || !download.body) throw new GitHubError(502);
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    const reader = download.body.getReader();
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        bytes += result.value.byteLength;
        if (bytes > 25 * 1024 * 1024)
          throw new Error("Repository archive exceeds 25 MiB");
        chunks.push(result.value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    return Buffer.concat(chunks);
  }
}
