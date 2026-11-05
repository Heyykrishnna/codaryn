import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtemp, writeFile, rm, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { extractQuality } from "@codaryn/engineering-analyzer";
import { runConfiguredScanners } from "./scanners.js";
import { runScannerCommand } from "./command.js";
test("configured Semgrep uses bundled local rules, strips repository ignores and removes the scan workspace", async () => {
  const files = {
      "a.ts": "eval(input);",
      ".semgrepignore": "*",
      ".semgrep.yml": "malicious",
    },
    result = extractQuality(files);
  let directory = "";
  await runConfiguredScanners(files, result.snapshot, false, {
    semgrepBinary: "/trusted/semgrep",
    allowOsv: false,
    command: async (_binary, args, cwd, home) => {
      directory = cwd;
      assert.deepEqual(await readdir(cwd), ["a.ts"]);
      assert.ok(home.startsWith(join(cwd, "..")));
      assert.ok(args.includes("--disable-version-check"));
      assert.ok(args.includes("--disable-nosem"));
      assert.ok(!args.includes("auto"));
      assert.ok(args.includes("--metrics"));
      const config = args[args.indexOf("--config") + 1];
      assert.ok(
        (await readFile(config, "utf8")).includes("codaryn.dynamic-eval"),
      );
      return JSON.stringify({
        version: "fixture",
        results: [
          {
            check_id: "codaryn.dynamic-eval",
            path: join(cwd, "a.ts"),
            start: { line: 1 },
            end: { line: 1 },
            extra: { lines: "redacted fixture source" },
          },
        ],
      });
    },
  });
  assert.equal(
    result.snapshot.scanners.find((item) => item.tool === "semgrep")?.status,
    "completed",
  );
  assert.ok(
    !JSON.stringify(result.snapshot).includes("redacted fixture source"),
  );
  await assert.rejects(() => readdir(directory));
});
test("OSV transmission requires request opt-in and platform policy; declared ranges are not queried", async () => {
  const files = {
    "package.json": JSON.stringify({ dependencies: { example: "^1.0.0" } }),
    "package-lock.json": JSON.stringify({
      packages: { "node_modules/example": { version: "1.2.3" } },
    }),
  };
  let requests = 0;
  const options = {
    allowOsv: false,
    request: async () => {
      requests++;
      return new Response(JSON.stringify({ results: [{}] }), { status: 200 });
    },
  };
  await runConfiguredScanners(
    files,
    extractQuality(files).snapshot,
    true,
    options,
  );
  assert.equal(requests, 0);
  await runConfiguredScanners(files, extractQuality(files).snapshot, false, {
    ...options,
    allowOsv: true,
  });
  assert.equal(requests, 0);
  const result = extractQuality(files);
  await runConfiguredScanners(files, result.snapshot, true, {
    ...options,
    allowOsv: true,
  });
  assert.equal(requests, 1);
  assert.equal(
    result.snapshot.scanners.find((item) => item.tool === "osv")?.status,
    "completed",
  );
});
test("scanner failures are redacted and do not become completed clean results", async () => {
  const files = { "a.ts": "eval(input);" },
    result = extractQuality(files);
  await runConfiguredScanners(files, result.snapshot, false, {
    semgrepBinary: "/trusted/semgrep",
    allowOsv: false,
    command: async () => {
      throw new Error("sensitive tool output fixture");
    },
  });
  assert.equal(
    result.snapshot.scanners.find((item) => item.tool === "semgrep")?.status,
    "failed",
  );
  assert.ok(
    !JSON.stringify(result.snapshot).includes("sensitive tool output fixture"),
  );
});
test("trusted scanner subprocess receives no backend secrets and stderr is never returned", async () => {
  const root = await mkdtemp(join(tmpdir(), "codaryn-scanner-command-")),
    binary = join(root, "semgrep");
  try {
    await writeFile(
      binary,
      `#!${process.execPath}\nprocess.stderr.write('private stderr fixture');process.stdout.write(JSON.stringify({keys:Object.keys(process.env)}));`,
      { mode: 0o700 },
    );
    const raw = await runScannerCommand(binary, [], root, root),
      result: unknown = JSON.parse(raw);
    assert.ok(
      typeof result === "object" &&
        result !== null &&
        "keys" in result &&
        Array.isArray(result.keys),
    );
    assert.ok(!result.keys.includes("DATABASE_URL"));
    assert.ok(!result.keys.includes("GITHUB_APP_PRIVATE_KEY"));
    assert.ok(!raw.includes("private stderr fixture"));
    await assert.rejects(() =>
      runScannerCommand(process.execPath, [], root, root),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
