import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  extractQuality,
  canonicalQuality,
  importSemgrep,
  importOsv,
  lookupOsv,
} from "./index.js";
function dependencyFixture() {
  return {
    "package.json": JSON.stringify({ dependencies: { example: "^1.0.0" } }),
    "package-lock.json": JSON.stringify({
      lockfileVersion: 3,
      packages: { "": {}, "node_modules/example": { version: "1.2.3" } },
    }),
  };
}
test("Docker stages, Compose service dependencies and Actions job needs retain configuration evidence", () => {
  const { snapshot } = extractQuality({
    Dockerfile:
      "FROM node:22 AS build\nRUN echo build\nFROM node:22-alpine\nCOPY --from=build /app /app\nUSER node",
    "compose.yaml":
      "services:\n  api:\n    image: node:22\n    depends_on: [db]\n    volumes: [store:/data]\n    networks: [private]\n  db:\n    image: postgres:17\nvolumes:\n  store: {}\nnetworks:\n  private: {}",
    ".github/workflows/check.yml":
      "on: [push]\njobs:\n  build:\n    steps:\n      - uses: actions/checkout@aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n  deploy:\n    needs: build\n    steps:\n      - run: echo deploy",
  });
  assert.equal(
    snapshot.resources.filter((item) => item.kind === "docker-stage").length,
    2,
  );
  assert.equal(
    snapshot.resources.filter((item) => item.kind === "service").length,
    2,
  );
  assert.equal(
    snapshot.resources.filter((item) => item.kind === "workflow-job").length,
    2,
  );
  assert.ok(snapshot.relations.some((item) => item.kind === "builds"));
  assert.ok(snapshot.relations.some((item) => item.kind === "mounts"));
  assert.equal(
    snapshot.relations.filter((item) => item.kind === "depends-on").length,
    2,
  );
  assert.ok(!snapshot.findings.some((item) => item.ruleId === "docker-user"));
});
test("environment views expose names only and supported configuration risks have evidence", () => {
  const value = "sensitiveFixtureValue123";
  const files = {
    "compose.yml":
      "services:\n  api:\n    image: node:22\n    privileged: true\n    volumes: [/var/run/docker.sock:/var/run/docker.sock]\n    environment:\n      DATABASE_PASSWORD: '" +
      value +
      "'",
    ".env.example": "DATABASE_URL=${DATABASE_URL}\nAPI_TOKEN=placeholder",
    "config.ts": "export const db=process.env.DATABASE_URL;",
    ".github/workflows/a.yml":
      "on: [pull_request_target]\npermissions: write-all\njobs:\n  ci:\n    steps:\n      - uses: actions/checkout@main",
  };
  const { snapshot } = extractQuality(files);
  assert.ok(
    snapshot.environment.some((item) => item.name === "DATABASE_PASSWORD"),
  );
  assert.ok(
    snapshot.findings.some((item) => item.ruleId === "compose-privileged"),
  );
  assert.ok(
    snapshot.findings.some((item) => item.ruleId === "workflow-pr-target"),
  );
  assert.ok(snapshot.findings.every((item) => item.evidence.path));
  assert.ok(!JSON.stringify(snapshot).includes(value));
});
test("Vitest and Jest test definitions link direct source calls without claiming execution", () => {
  const { snapshot } = extractQuality({
    "src/math.ts": "export function add(a:number,b:number){return a+b;}",
    "math.test.ts":
      "import {test as check} from 'vitest'; import {add} from './src/math'; check('adds',()=>{add(1,2)}); check.skip('skipped',()=>add(2,3));",
    "other.spec.ts":
      "import {it} from '@jest/globals'; import {add as sum} from './src/math'; it('sum',()=>sum(1,2));",
  });
  assert.equal(snapshot.tests.length, 3);
  assert.ok(
    snapshot.tests.some(
      (item) => item.framework === "vitest" && item.mode === "skip",
    ),
  );
  assert.ok(snapshot.tests.some((item) => item.framework === "jest"));
  assert.equal(snapshot.testLinks.length, 3);
  assert.ok(
    snapshot.testLinks.every(
      (item) =>
        item.symbolName === "add" && item.targetEvidence.path === "src/math.ts",
    ),
  );
});
test("LCOV and Istanbul coverage preserve metrics and reject outside source paths", () => {
  const { snapshot } = extractQuality({
    "src/a.ts": "export const x=1;\nexport const y=2;",
    "coverage/lcov.info":
      "SF:/runner/project/src/a.ts\nDA:1,1\nDA:2,0\nend_of_record\nSF:/etc/private.ts\nDA:1,1\nend_of_record",
    "coverage/coverage-final.json": JSON.stringify({
      "/runner/project/src/a.ts": {
        path: "/runner/project/src/a.ts",
        s: { 0: 1, 1: 0 },
      },
    }),
  });
  assert.equal(snapshot.coverage.length, 2);
  assert.ok(
    snapshot.coverage.every(
      (item) =>
        item.path === "src/a.ts" && item.covered === 1 && item.total === 2,
    ),
  );
  assert.ok(snapshot.coverage.some((item) => item.metric === "lines"));
  assert.ok(snapshot.coverage.some((item) => item.metric === "statements"));
  assert.ok(snapshot.diagnostics.some((item) => item.code === "COVERAGE_PATH"));
});
test("supported secrets and dynamic shell patterns are redacted with positive and negative cases", () => {
  const token = "ghp_" + "x".repeat(32),
    literal = "uniqueFixtureCredential999";
  const { snapshot } = extractQuality({
    "a.ts":
      "import {exec as run} from 'node:child_process'; const apiKey='" +
      token +
      "'; const password='" +
      literal +
      "'; run(input); run('fixed command'); eval(input);",
    "safe.ts":
      "const password=process.env.PASSWORD; const apiKey='placeholder'; const cmd='echo';",
  });
  assert.ok(
    snapshot.findings.some((item) => item.ruleId === "credential-token"),
  );
  assert.ok(
    snapshot.findings.some((item) => item.ruleId === "credential-literal"),
  );
  assert.equal(
    snapshot.findings.filter((item) => item.ruleId === "dynamic-shell").length,
    1,
  );
  assert.ok(
    !snapshot.findings.some((item) => item.evidence.path === "safe.ts"),
  );
  assert.ok(!JSON.stringify(snapshot).includes(token));
  assert.ok(!JSON.stringify(snapshot).includes(literal));
});
test("declared dependency ranges remain distinct from resolved npm and pnpm versions", () => {
  const { snapshot } = extractQuality({
    ...dependencyFixture(),
    "pnpm-lock.yaml":
      "lockfileVersion: '9.0'\npackages:\n  other@2.3.4(peer@1.0.0): {}\n  '@scope/tool@3.2.1': {}",
  });
  assert.ok(
    snapshot.dependencies.some(
      (dep) =>
        dep.name === "example" &&
        dep.provenance === "declared" &&
        dep.version === "^1.0.0",
    ),
  );
  assert.ok(
    snapshot.dependencies.some(
      (dep) =>
        dep.name === "example" &&
        dep.provenance === "resolved" &&
        dep.version === "1.2.3",
    ),
  );
  assert.ok(
    snapshot.dependencies.some(
      (dep) => dep.name === "@scope/tool" && dep.version === "3.2.1",
    ),
  );
  assert.equal(
    snapshot.scanners.find((item) => item.tool === "osv")?.status,
    "disabled",
  );
});
test("malformed and unsupported configuration is diagnostic and hashes are deterministic", () => {
  const files = {
    "compose.yaml": "services:\n  duplicate: {}\n  duplicate: {}",
    "a.ts": "export const x=1;",
  };
  const first = extractQuality(files);
  assert.ok(
    first.snapshot.diagnostics.some(
      (item) => item.code === "CONFIGURATION_PARTIAL",
    ),
  );
  assert.equal(
    first.hash,
    extractQuality({
      "a.ts": files["a.ts"],
      "compose.yaml": files["compose.yaml"],
    }).hash,
  );
  assert.throws(() => extractQuality({ "../outside.json": "{}" }));
  assert.throws(() => extractQuality({ "/outside.ts": "" }));
});
test("Semgrep import only accepts trusted rule IDs and known source ranges, never raw match text", () => {
  const files = { "a.ts": "eval(input);" },
    result = extractQuality(files),
    matched = "doNotPersistScannerMatch";
  importSemgrep(
    {
      version: "fixture",
      results: [
        {
          check_id: "codaryn.dynamic-eval",
          path: "a.ts",
          start: { line: 1 },
          end: { line: 1 },
          extra: { lines: matched, message: matched },
        },
        {
          check_id: "untrusted.rule",
          path: "../outside.ts",
          start: { line: 1 },
          end: { line: 1 },
        },
      ],
    },
    files,
    result.snapshot,
  );
  assert.ok(result.snapshot.findings.some((item) => item.tool === "semgrep"));
  assert.equal(
    result.snapshot.scanners.find((item) => item.tool === "semgrep")?.status,
    "partial",
  );
  assert.ok(!JSON.stringify(result.snapshot).includes(matched));
  assert.doesNotThrow(() => canonicalQuality(result.snapshot));
});
test("OSV-Scanner imports bind advisories to resolved dependencies and preserve unknown severity", () => {
  const files = dependencyFixture(),
    result = extractQuality(files);
  importOsv(
    {
      results: [
        {
          source: { path: "package-lock.json" },
          packages: [
            {
              package: { name: "example", version: "1.2.3", ecosystem: "npm" },
              vulnerabilities: [
                {
                  id: "GHSA-fixture-test-0001",
                  summary: "redacted arbitrary summary",
                },
              ],
            },
          ],
        },
      ],
    },
    files,
    result.snapshot,
  );
  const finding = result.snapshot.findings.find((item) => item.tool === "osv")!;
  assert.ok(finding);
  assert.equal(finding.severity, "unknown");
  assert.equal(
    result.snapshot.dependencies.find((dep) => dep.id === finding.dependencyId)
      ?.provenance,
    "resolved",
  );
  assert.ok(
    !JSON.stringify(result.snapshot).includes("redacted arbitrary summary"),
  );
});
test("OSV lookup transmits only resolved package versions and failures never assert a clean scan", async () => {
  const result = extractQuality(dependencyFixture());
  let body = "";
  await lookupOsv(result.snapshot, async (_input, init) => {
    body = String(init?.body);
    return new Response(
      JSON.stringify({
        results: [{ vulns: [{ id: "GHSA-fixture-test-0001" }] }],
      }),
      { status: 200 },
    );
  });
  assert.ok(body.includes('"version":"1.2.3"'));
  assert.ok(!body.includes("^1.0.0"));
  assert.equal(
    result.snapshot.scanners.find((item) => item.tool === "osv")?.status,
    "completed",
  );
  await lookupOsv(
    result.snapshot,
    async () => new Response("unavailable", { status: 503 }),
  );
  assert.equal(
    result.snapshot.scanners.find((item) => item.tool === "osv")?.status,
    "failed",
  );
});

test("detected credential values are also removed when reused as labels elsewhere", () => {
  const value = "privateFixtureValue999";
  const { snapshot } = extractQuality({
    "config.ts": "const password='" + value + "';",
    "a.test.ts": "test('" + value + "',()=>{});",
  });
  assert.ok(snapshot.findings.some((finding) => finding.category === "secret"));
  assert.ok(!JSON.stringify(snapshot).includes(value));
  assert.equal(snapshot.tests[0].name, "[REDACTED]");
});
test("LCOV merges repeated records and unquoted credential-like values are redacted", () => {
  const value = "unquotedFixtureCredential999";
  const { snapshot } = extractQuality({
    ".env": "PASSWORD=" + value,
    "a.ts": "const x=1;\nconst y=2;",
    "lcov.info":
      "SF:a.ts\nDA:1,1\nend_of_record\nSF:a.ts\nDA:2,0\nend_of_record",
  });
  assert.ok(
    snapshot.findings.some((finding) => finding.ruleId === "credential-env"),
  );
  assert.ok(!JSON.stringify(snapshot).includes(value));
  assert.equal(snapshot.coverage[0].total, 2);
  assert.equal(snapshot.coverage[0].covered, 1);
});

test("redacted dependency identifiers are never transmitted to OSV", async () => {
  const result = extractQuality(dependencyFixture());
  for (const dependency of result.snapshot.dependencies)
    dependency.name = "[REDACTED]";
  let requests = 0;
  await lookupOsv(result.snapshot, async () => {
    requests++;
    throw new Error("Unexpected request");
  });
  assert.equal(requests, 0);
  assert.match(
    result.snapshot.scanners.find((scanner) => scanner.tool === "osv")
      ?.message ?? "",
    /not scanned/,
  );
});
