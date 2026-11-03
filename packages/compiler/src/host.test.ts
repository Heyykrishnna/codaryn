import { test } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import { createVirtualCompilerHost, normalizeVirtualPath } from "./host.js";
import { discoverTsconfigs } from "./tsconfig.js";
import { createAnalysisProgram } from "./program.js";

test("normalizeVirtualPath strips leading slashes and resolves relative segments safely", () => {
  assert.equal(normalizeVirtualPath("/src/index.ts"), "src/index.ts");
  assert.equal(
    normalizeVirtualPath("packages/core/../utils/math.ts"),
    "packages/utils/math.ts",
  );
  assert.equal(normalizeVirtualPath("..//..//secret.ts"), "secret.ts");
});

test("createVirtualCompilerHost creates source files and checks file existence in memory", () => {
  const files = new Map<string, string>([
    ["src/index.ts", "export const value: number = 42;"],
    ["src/helper.ts", "export function help(): string { return 'ok'; }"],
  ]);

  const host = createVirtualCompilerHost(files);
  assert.equal(host.fileExists("src/index.ts"), true);
  assert.equal(host.fileExists("src/missing.ts"), false);

  const sourceFile = host.getSourceFile("src/index.ts", ts.ScriptTarget.Latest);
  assert.ok(sourceFile !== undefined);
  assert.equal(sourceFile.fileName, "src/index.ts");
  assert.equal(sourceFile.text, "export const value: number = 42;");
});

test("discoverTsconfigs locates and parses multiple tsconfig files and project references", () => {
  const files = new Map<string, string>([
    [
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: { strict: true },
        references: [{ path: "./packages/core" }],
      }),
    ],
    [
      "packages/core/tsconfig.json",
      JSON.stringify({
        compilerOptions: { composite: true, outDir: "./dist" },
      }),
    ],
  ]);

  const configs = discoverTsconfigs(files);
  assert.equal(configs.length, 2);
  assert.equal(configs[0].path, "packages/core/tsconfig.json");
  assert.equal(configs[1].path, "tsconfig.json");
  assert.deepEqual(configs[1].projectReferences, ["packages/core"]);
});

test("createAnalysisProgram constructs a valid ts.Program across multiple files", () => {
  const files = new Map<string, string>([
    [
      "src/index.ts",
      "import { add } from './math.js'; export const sum = add(1, 2);",
    ],
    [
      "src/math.ts",
      "export function add(a: number, b: number): number { return a + b; }",
    ],
  ]);

  const { program, rootFileNames } = createAnalysisProgram(files);
  assert.equal(rootFileNames.length, 2);
  const src = program.getSourceFile("src/index.ts");
  assert.ok(src !== undefined);
  assert.equal(src.statements.length, 2);
});
