import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { SymbolLinker } from "./linker.js";

describe("SymbolLinker", () => {
  const dummyLoc = {
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 20,
  };

  const inventories = [
    {
      path: "src/calculator.ts",
      functions: [
        {
          id: "sym:func:add",
          name: "add",
          kind: "function" as const,
          parameters: [],
          returnType: "number",
          modifiers: [],
          isAsync: false,
          isGenerator: false,
          location: { path: "src/calculator.ts", ...dummyLoc },
        },
      ],
      classes: [],
      interfaces: [],
      types: [],
      importsExports: [],
    },
    {
      path: "src/button.tsx",
      functions: [],
      classes: [
        {
          id: "sym:class:Button",
          name: "Button",
          implements: [],
          methods: [],
          properties: [],
          modifiers: ["export", "default"],
          location: { path: "src/button.tsx", ...dummyLoc },
        },
      ],
      interfaces: [],
      types: [],
      importsExports: [],
    },
    {
      path: "src/barrel.ts",
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
      importsExports: [
        {
          id: "sym:exp:1",
          kind: "export" as const,
          moduleSpecifier: "./calculator",
          isTypeOnly: false,
          isDefault: false,
          isNamespace: true,
          specifiers: [],
          location: { path: "src/barrel.ts", ...dummyLoc },
        },
      ],
    },
    {
      path: "src/consumer.ts",
      functions: [],
      classes: [],
      interfaces: [],
      types: [],
      importsExports: [
        {
          id: "sym:imp:1",
          kind: "import" as const,
          moduleSpecifier: "./calculator",
          isTypeOnly: false,
          isDefault: false,
          isNamespace: false,
          specifiers: [{ name: "add" }, { name: "missingSymbol" }],
          location: { path: "src/consumer.ts", ...dummyLoc },
        },
        {
          id: "sym:imp:2",
          kind: "import" as const,
          moduleSpecifier: "./button",
          isTypeOnly: false,
          isDefault: true,
          isNamespace: false,
          specifiers: [{ name: "Button" }],
          location: { path: "src/consumer.ts", ...dummyLoc },
        },
        {
          id: "sym:imp:3",
          kind: "import" as const,
          moduleSpecifier: "./barrel",
          isTypeOnly: false,
          isDefault: false,
          isNamespace: false,
          specifiers: [{ name: "add", alias: "addAlias" }],
          location: { path: "src/consumer.ts", ...dummyLoc },
        },
        {
          id: "sym:imp:4",
          kind: "import" as const,
          moduleSpecifier: "react",
          isTypeOnly: false,
          isDefault: false,
          isNamespace: false,
          specifiers: [{ name: "useState" }],
          location: { path: "src/consumer.ts", ...dummyLoc },
        },
      ],
    },
  ];

  it("links direct named imports with target symbol ids and locations", () => {
    const linker = new SymbolLinker(inventories);
    const refs = linker.resolveAllReferences(inventories);

    const addRef = refs.find(
      (r) =>
        r.sourceFile === "src/consumer.ts" &&
        r.moduleSpecifier === "./calculator" &&
        r.sourceSymbolName === "add",
    );
    assert.ok(addRef);
    assert.equal(addRef.status, "resolved");
    assert.equal(addRef.targetFile, "src/calculator.ts");
    assert.equal(addRef.targetSymbolId, "sym:func:add");
    assert.equal(addRef.evidence.path, "src/consumer.ts");
  });

  it("links default imports with target symbol ids", () => {
    const linker = new SymbolLinker(inventories);
    const refs = linker.resolveAllReferences(inventories);

    const buttonRef = refs.find(
      (r) =>
        r.sourceFile === "src/consumer.ts" &&
        r.moduleSpecifier === "./button" &&
        r.sourceSymbolName === "default",
    );
    assert.ok(buttonRef);
    assert.equal(buttonRef.status, "resolved");
    assert.equal(buttonRef.targetFile, "src/button.tsx");
    assert.equal(buttonRef.targetSymbolId, "sym:class:Button");
  });

  it("resolves symbols through re-export barrels", () => {
    const linker = new SymbolLinker(inventories);
    const refs = linker.resolveAllReferences(inventories);

    const barrelRef = refs.find(
      (r) =>
        r.sourceFile === "src/consumer.ts" &&
        r.moduleSpecifier === "./barrel" &&
        r.sourceSymbolName === "add",
    );
    assert.ok(barrelRef);
    assert.equal(barrelRef.status, "resolved");
    assert.equal(barrelRef.targetFile, "src/barrel.ts");
    assert.equal(barrelRef.targetSymbolId, "sym:func:add");
    assert.equal(barrelRef.localAlias, "addAlias");
  });

  it("classifies third-party imports as external", () => {
    const linker = new SymbolLinker(inventories);
    const refs = linker.resolveAllReferences(inventories);

    const reactRef = refs.find(
      (r) =>
        r.sourceFile === "src/consumer.ts" &&
        r.moduleSpecifier === "react" &&
        r.sourceSymbolName === "useState",
    );
    assert.ok(reactRef);
    assert.equal(reactRef.status, "external");
    assert.equal(reactRef.targetFile, null);
    assert.equal(reactRef.targetSymbolId, null);
  });

  it("marks non-existent symbols as unresolved without synthesizing edges", () => {
    const linker = new SymbolLinker(inventories);
    const refs = linker.resolveAllReferences(inventories);

    const missingRef = refs.find(
      (r) =>
        r.sourceFile === "src/consumer.ts" &&
        r.moduleSpecifier === "./calculator" &&
        r.sourceSymbolName === "missingSymbol",
    );
    assert.ok(missingRef);
    assert.equal(missingRef.status, "unresolved");
    assert.equal(missingRef.targetSymbolId, null);
  });
});
