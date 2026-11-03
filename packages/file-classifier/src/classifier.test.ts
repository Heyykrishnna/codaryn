import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  classifyFile,
  classifyRepositoryFiles,
  detectLanguage,
  detectRole,
  detectFrameworks,
} from "./classifier.js";

test("detectLanguage recognizes TypeScript, TSX, JavaScript, JSX, and JSON", () => {
  assert.equal(detectLanguage("src/index.ts").language, "typescript");
  assert.equal(detectLanguage("components/Button.tsx").language, "tsx");
  assert.equal(detectLanguage("lib/utils.js").language, "javascript");
  assert.equal(detectLanguage("lib/utils.mjs").language, "javascript");
  assert.equal(detectLanguage("lib/utils.cjs").language, "javascript");
  assert.equal(detectLanguage("views/Card.jsx").language, "jsx");
  assert.equal(detectLanguage("package.json").language, "json");
  assert.equal(detectLanguage("styles/main.css").language, "unknown");
});

test("detectRole distinguishes source, test, config, declaration, documentation, and asset", () => {
  assert.equal(detectRole("src/index.ts", "typescript", ".ts"), "source");
  assert.equal(detectRole("src/index.test.ts", "typescript", ".ts"), "test");
  assert.equal(detectRole("tests/unit.spec.js", "javascript", ".js"), "test");
  assert.equal(
    detectRole("src/types/env.d.ts", "typescript", ".ts"),
    "declaration",
  );
  assert.equal(detectRole("tsconfig.json", "json", ".json"), "config");
  assert.equal(
    detectRole(".github/workflows/ci.yml", "unknown", ".yml"),
    "config",
  );
  assert.equal(detectRole("README.md", "unknown", ".md"), "documentation");
  assert.equal(detectRole("public/logo.svg", "unknown", ".svg"), "asset");
});

test("detectFrameworks discovers React, Next, Fastify, and Tailwind from content", () => {
  const reactContent = 'import React, { useState } from "react";';
  assert.ok(detectFrameworks("src/App.tsx", reactContent).includes("react"));

  const fastifyContent = 'import fastify, { FastifyInstance } from "fastify";';
  assert.ok(
    detectFrameworks("src/server.ts", fastifyContent).includes("fastify"),
  );

  const nextContent = 'import { useRouter } from "next/navigation";';
  assert.ok(detectFrameworks("app/page.tsx", nextContent).includes("next"));
});

test("classifyRepositoryFiles sorts by path and computes metrics correctly", () => {
  const files = [
    { path: "src/b.ts", content: "export const b = 2;\n" },
    {
      path: "src/a.ts",
      content: "export const a = 1;\nexport const a2 = 2;\n",
    },
  ];
  const classified = classifyRepositoryFiles(files);
  assert.equal(classified[0].path, "src/a.ts");
  assert.equal(classified[0].linesOfCode, 3);
  assert.equal(classified[1].path, "src/b.ts");
});
