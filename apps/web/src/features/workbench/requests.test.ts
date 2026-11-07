import assert from "node:assert/strict";
import test from "node:test";
import { parseStatusTests, statusTestResults } from "./assertions";
import { workbenchOrigins } from "./origins.mjs";
import { importRequests, requestUrl } from "./requests";

test("workbench rejects redirects to another host and never targets the application host", () => {
  const targets = workbenchOrigins(
    "https://fixture.example,https://app.example:8443,https://fixture.example/path,https://user@fixture.example",
    false,
  );
  assert.deepEqual(targets, [
    "https://fixture.example",
    "https://app.example:8443",
  ]);
  assert.equal(
    requestUrl(targets[0], "/ping?probe=1", targets, "app.example").href,
    "https://fixture.example/ping?probe=1",
  );
  for (const path of [
    "//other.example/ping",
    "/\\other.example/ping",
    "https://other.example/ping",
    "/ping#secret",
  ]) {
    assert.throws(() => requestUrl(targets[0], path, targets, "app.example"));
  }
  assert.throws(() => requestUrl(targets[1], "/ping", targets, "app.example"));
});

test("imported requests are relative templates and collection scripts and credentials are discarded", () => {
  const requests = importRequests({
    info: { schema: "collection" },
    item: [
      {
        name: "Fixture",
        event: [
          {
            listen: "test",
            script: { exec: ["pm.sendRequest('https://other.example')"] },
          },
        ],
        request: {
          method: "GET",
          url: { raw: "https://previous.example/ping" },
          auth: { token: "secret" },
        },
      },
    ],
  });
  assert.deepEqual(requests, [
    { name: "Fixture", method: "GET", path: "/ping", body: "" },
  ]);
  assert.deepEqual(
    importRequests({
      openapi: "3.1.0",
      paths: { "/status": { get: {}, parameters: [] } },
    }),
    [{ name: "GET /status", method: "GET", path: "/status", body: "" }],
  );
  assert.deepEqual(
    importRequests({
      resources: [
        {
          _type: "request",
          name: "Ping",
          method: "POST",
          url: "{{origin}}/ping",
          body: { text: "{}" },
        },
      ],
    }),
    [{ name: "Ping", method: "POST", path: "/ping", body: "{}" }],
  );
});

test("status assertions are parsed without executing arbitrary collection code", () => {
  const checks = parseStatusTests(
    'pm.test("Created", () => { pm.response.to.have.status(201); });',
  );
  assert.equal(statusTestResults(checks, 201)[0]?.passed, true);
  assert.equal(statusTestResults(checks, 200)[0]?.passed, false);
  assert.throws(() =>
    parseStatusTests(
      'pm.test("unsafe", () => { fetch("/api/auth/get-session"); });',
    ),
  );
});
