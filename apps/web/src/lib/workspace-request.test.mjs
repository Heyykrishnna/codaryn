import { test } from "node:test";
import { strict as assert } from "node:assert";
import { workspaceRequest } from "./workspace-request.ts";

test("workspace reads encode filters, omit absent values and bypass shared caches", async (context) => {
  const previous = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = previous;
  });
  globalThis.fetch = async (input, options) => {
    const url = new URL(String(input), "https://example.test");
    assert.equal(url.pathname, "/api/v1/backend/routes");
    assert.equal(url.searchParams.get("workspaceId"), "workspace");
    assert.equal(url.searchParams.get("search"), "a&b / c");
    assert.equal(url.searchParams.has("missing"), false);
    assert.equal(url.searchParams.has("empty"), false);
    assert.equal(options.method, "GET");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
    assert.equal(options.body, undefined);
    return Response.json({ routes: [] });
  };
  assert.deepEqual(
    await workspaceRequest("backend", "routes", "workspace", {
      search: "a&b / c",
      missing: undefined,
      empty: null,
    }),
    { routes: [] },
  );
});

test("workspace mutations preserve origin guard headers and the selected workspace", async (context) => {
  const previous = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = previous;
  });
  globalThis.fetch = async (_input, options) => {
    assert.equal(options.method, "POST");
    assert.equal(options.headers["content-type"], "application/json");
    assert.equal(options.headers["x-codaryn-request"], "workspace");
    assert.deepEqual(JSON.parse(options.body), {
      name: "Preset",
      workspaceId: "workspace",
    });
    return Response.json({ success: true });
  };
  await workspaceRequest(
    "studio",
    "save",
    "workspace",
    { name: "Preset", workspaceId: "other" },
    true,
  );
});

test("safe API errors are surfaced and malformed error bodies use the supplied fallback", async (context) => {
  const previous = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = previous;
  });
  globalThis.fetch = async () =>
    Response.json({ error: { message: "Access denied" } }, { status: 403 });
  await assert.rejects(
    workspaceRequest("graph", "snapshot", "workspace"),
    /Access denied/,
  );
  globalThis.fetch = async () =>
    new Response("<html>Proxy error</html>", { status: 502 });
  await assert.rejects(
    workspaceRequest(
      "graph",
      "snapshot",
      "workspace",
      {},
      false,
      "Graph unavailable",
    ),
    /Graph unavailable/,
  );
  globalThis.fetch = async () => {
    throw new Error("Network unavailable");
  };
  await assert.rejects(
    workspaceRequest("backend", "overview", "workspace"),
    /Network unavailable/,
  );
});

test("quality review preserves revision and external lookup remains explicit", async (context) => {
  const previous = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = previous;
  });
  const bodies = [];
  globalThis.fetch = async (input, options) => {
    assert.match(String(input), /^\/api\/v1\/quality\//);
    assert.equal(options.headers["x-codaryn-request"], "workspace");
    bodies.push(JSON.parse(options.body));
    return Response.json({ success: true });
  };
  await workspaceRequest(
    "quality",
    "request",
    "workspace",
    { jobId: "job", externalScans: false },
    true,
  );
  await workspaceRequest(
    "quality",
    "review",
    "workspace",
    {
      snapshotId: "snapshot",
      findingId: "finding",
      state: "confirmed",
      severity: null,
      reason: "verified",
      revision: 3,
    },
    true,
  );
  assert.equal(bodies[0].externalScans, false);
  assert.deepEqual(bodies[1], {
    workspaceId: "workspace",
    snapshotId: "snapshot",
    findingId: "finding",
    state: "confirmed",
    severity: null,
    reason: "verified",
    revision: 3,
  });
});

test("comparison mutations retain the explicit baseline and full-verification option", async (context) => {
  const previous = globalThis.fetch;
  context.after(() => {
    globalThis.fetch = previous;
  });
  globalThis.fetch = async (input, options) => {
    assert.match(String(input), /^\/api\/v1\/comparison\/request/);
    assert.equal(options.headers["x-codaryn-request"], "workspace");
    assert.deepEqual(JSON.parse(options.body), {
      workspaceId: "workspace",
      jobId: "job",
      baseId: "baseline",
      verifyFull: true,
    });
    return Response.json({ ok: true });
  };
  await workspaceRequest(
    "comparison",
    "request",
    "workspace",
    { jobId: "job", baseId: "baseline", verifyFull: true },
    true,
  );
});
