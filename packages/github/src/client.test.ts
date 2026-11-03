import { test } from "node:test";
import { strict as assert } from "node:assert";
import { generateKeyPairSync } from "node:crypto";
import { GitHubClient, GitHubError } from "./index.js";
const key = generateKeyPairSync("rsa", { modulusLength: 2048 })
  .privateKey.export({ type: "pkcs8", format: "pem" })
  .toString();
const sha = "a".repeat(40);
function json(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

test("installation ownership is checked against the authenticated GitHub user", async () => {
  const transport: typeof fetch = async (input) => {
    const path = new URL(String(input)).pathname;
    if (path === "/user") return json({ id: 1, login: "owner" });
    return json({
      account: { id: 2, login: "other", type: "User" },
      permissions: { contents: "read" },
      suspended_at: null,
    });
  };
  const client = new GitHubClient({ appId: "123", privateKey: key }, transport);
  await assert.rejects(
    client.verifyInstallation(1, "user-token"),
    (error) => error instanceof GitHubError && error.status === 403,
  );
});

test("archives are pinned and downloaded without forwarding installation credentials", async () => {
  let redirectedHeaders: HeadersInit | undefined;
  let archivePath = "";
  const transport: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/access_tokens"))
      return json({
        token: "installation-token",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
        permissions: { contents: "read" },
        repository_selection: "all",
      });
    if (url.hostname === "codeload.github.com") {
      redirectedHeaders = init?.headers;
      return new Response("archive");
    }
    archivePath = url.pathname;
    return new Response(null, {
      status: 302,
      headers: {
        location: `https://codeload.github.com/owner/repo/legacy.tar.gz/${sha}`,
      },
    });
  };
  const client = new GitHubClient({ appId: "123", privateKey: key }, transport);
  assert.equal(
    (await client.archive(1, "owner/repo", sha)).toString(),
    "archive",
  );
  assert.equal(archivePath, `/repos/owner/repo/tarball/${sha}`);
  assert.equal(redirectedHeaders, undefined);
});

test("rate limits are surfaced with a bounded retry and hostile redirects are rejected", async () => {
  const transport: typeof fetch = async (input) => {
    if (new URL(String(input)).pathname.endsWith("/access_tokens"))
      return json({
        token: "token",
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
    return json({}, 403, {
      "x-ratelimit-remaining": "0",
      "retry-after": "99999",
    });
  };
  const client = new GitHubClient({ appId: "123", privateKey: key }, transport);
  await assert.rejects(
    client.resolve(1, "owner/repo", "main"),
    (error) =>
      error instanceof GitHubError &&
      error.status === 429 &&
      error.retryAfter === 3600,
  );
  const hostile: typeof fetch = async (input) =>
    new URL(String(input)).pathname.endsWith("/access_tokens")
      ? json({
          token: "token",
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        })
      : new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/internal" },
        });
  await assert.rejects(
    new GitHubClient({ appId: "123", privateKey: key }, hostile).archive(
      1,
      "owner/repo",
      sha,
    ),
  );
});

test("an expired installation token is refreshed once", async () => {
  let tokens = 0;
  let calls = 0;
  const transport: typeof fetch = async (input) => {
    if (new URL(String(input)).pathname.endsWith("/access_tokens"))
      return json({
        token: `token-${++tokens}`,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      });
    return ++calls === 1 ? json({}, 401) : json({ sha });
  };
  const client = new GitHubClient({ appId: "123", privateKey: key }, transport);
  assert.equal(await client.resolve(7, "owner/repo", "main"), sha);
  assert.equal(tokens, 2);
  assert.equal(calls, 2);
});
