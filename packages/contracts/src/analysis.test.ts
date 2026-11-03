import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  sourceLocationSchema,
  sourceFileClassificationSchema,
  functionSymbolSchema,
  classSymbolSchema,
  interfaceSymbolSchema,
  typeAliasSymbolSchema,
  importExportSymbolSchema,
  analysisJobSummarySchema,
} from "./analysis.js";

test("source location requires non-reversed boundaries", () => {
  const valid = sourceLocationSchema.parse({
    path: "src/index.ts",
    startLine: 10,
    startColumn: 1,
    endLine: 15,
    endColumn: 20,
  });
  assert.equal(valid.path, "src/index.ts");

  assert.throws(() =>
    sourceLocationSchema.parse({
      path: "src/index.ts",
      startLine: 15,
      startColumn: 1,
      endLine: 10,
      endColumn: 20,
    }),
  );

  assert.throws(() =>
    sourceLocationSchema.parse({
      path: "src/index.ts",
      startLine: 10,
      startColumn: 25,
      endLine: 10,
      endColumn: 5,
    }),
  );
});

test("source file classification validates language and roles", () => {
  const classification = sourceFileClassificationSchema.parse({
    path: "apps/web/app/page.tsx",
    extension: ".tsx",
    language: "tsx",
    role: "source",
    sizeBytes: 1024,
    frameworks: ["react", "next"],
    linesOfCode: 42,
  });
  assert.equal(classification.language, "tsx");
  assert.equal(classification.frameworks.length, 2);
});

test("symbol schemas enforce structured definitions with locations", () => {
  const location = {
    path: "packages/core/math.ts",
    startLine: 1,
    startColumn: 1,
    endLine: 5,
    endColumn: 2,
  };

  const fn = functionSymbolSchema.parse({
    id: "fn-1",
    name: "calculate",
    kind: "function",
    parameters: [{ name: "value", type: "number", optional: false }],
    returnType: "number",
    modifiers: ["export"],
    isAsync: false,
    isGenerator: false,
    location,
  });
  assert.equal(fn.name, "calculate");

  const cls = classSymbolSchema.parse({
    id: "cls-1",
    name: "Engine",
    implements: ["Runnable"],
    methods: [fn],
    properties: [
      { name: "speed", type: "number", modifiers: ["public"], optional: false },
    ],
    modifiers: ["export"],
    location,
  });
  assert.equal(cls.name, "Engine");

  const iface = interfaceSymbolSchema.parse({
    id: "iface-1",
    name: "Config",
    extends: [],
    properties: [
      { name: "debug", type: "boolean", optional: true, readonly: true },
    ],
    methods: [],
    location,
  });
  assert.equal(iface.properties[0].readonly, true);

  const typeAlias = typeAliasSymbolSchema.parse({
    id: "type-1",
    name: "ID",
    type: "string | number",
    location,
  });
  assert.equal(typeAlias.name, "ID");

  const imp = importExportSymbolSchema.parse({
    id: "imp-1",
    kind: "import",
    moduleSpecifier: "react",
    isTypeOnly: false,
    isDefault: false,
    isNamespace: false,
    specifiers: [{ name: "useState" }],
    location,
  });
  assert.equal(imp.moduleSpecifier, "react");
});

test("analysis job summary enforces stages and lifecycle states", () => {
  const summary = analysisJobSummarySchema.parse({
    id: "123e4567-e89b-12d3-a456-426614174000",
    manifestId: "123e4567-e89b-12d3-a456-426614174001",
    repositoryId: "123e4567-e89b-12d3-a456-426614174002",
    status: "running",
    currentStage: "parsing",
    stages: [
      {
        stage: "inventory",
        status: "completed",
        itemsTotal: 10,
        itemsCompleted: 10,
      },
      {
        stage: "parsing",
        status: "running",
        itemsTotal: 10,
        itemsCompleted: 4,
      },
    ],
    fileCount: 10,
    symbolCount: 25,
    diagnosticCount: 1,
    retries: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    failureReason: null,
  });

  assert.equal(summary.status, "running");
  assert.equal(summary.stages.length, 2);
});
