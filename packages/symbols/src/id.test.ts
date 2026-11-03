import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  generateSymbolId,
  createEmptySymbolInventory,
  mergeSymbolInventories,
} from "./id.js";

test("generateSymbolId produces deterministic canonical identifiers", () => {
  const id1 = generateSymbolId("src/index.ts", "function", "render", 10, 5);
  const id2 = generateSymbolId("/src/index.ts", "function", "render", 10, 5);
  assert.equal(id1, id2);
  assert.equal(id1, "sym:src/index.ts:function:render:10:5");
});

test("mergeSymbolInventories combines and sorts inventories alphabetically by id", () => {
  const inv1 = createEmptySymbolInventory();
  inv1.functions.push({
    id: "sym:src/b.ts:function:beta:1:1",
    name: "beta",
    kind: "function",
    parameters: [],
    returnType: "void",
    modifiers: [],
    isAsync: false,
    isGenerator: false,
    location: {
      path: "src/b.ts",
      startLine: 1,
      startColumn: 1,
      endLine: 2,
      endColumn: 2,
    },
  });

  const inv2 = createEmptySymbolInventory();
  inv2.functions.push({
    id: "sym:src/a.ts:function:alpha:1:1",
    name: "alpha",
    kind: "function",
    parameters: [],
    returnType: "void",
    modifiers: [],
    isAsync: false,
    isGenerator: false,
    location: {
      path: "src/a.ts",
      startLine: 1,
      startColumn: 1,
      endLine: 2,
      endColumn: 2,
    },
  });

  const merged = mergeSymbolInventories([inv1, inv2]);
  assert.equal(merged.functions.length, 2);
  assert.equal(merged.functions[0].name, "alpha");
  assert.equal(merged.functions[1].name, "beta");
});
