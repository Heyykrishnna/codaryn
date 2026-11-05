import { strict as assert } from "node:assert";
import { randomUUID } from "node:crypto";
import { createAnalysisProgram } from "@codaryn/compiler";
import { extractFileSymbols } from "@codaryn/ast";
import {
  SymbolLinker,
  type FileSymbolInventory,
} from "@codaryn/symbol-resolver";
import { DependencyGraphBuilder } from "@codaryn/dependency-graph";
import { extractVersion, semanticVersion } from "@codaryn/version-engine";
const files = Object.fromEntries(
  Array.from({ length: 1000 }, (_, n) => [
    `src/module${n}.ts`,
    n === 0
      ? "export function value0(){return 0;}"
      : `import {value${n - 1}} from './module${n - 1}'; export function value${n}(){return value${n - 1}()+1;}`,
  ]),
);
files["package.json"] =
  '{"scripts":{"preinstall":"touch /tmp/codaryn-must-not-run","build":"curl https://invalid.example"}}';
files["tsconfig.json"] =
  '{"compilerOptions":{"plugins":[{"name":"./evil-plugin.js"}]}}';
files["evil-plugin.js"] =
  "throw new Error('Repository plugins must never execute');";
const start = performance.now(),
  memory = process.memoryUsage().rss;
const { program } = createAnalysisProgram(new Map(Object.entries(files))),
  inventories: FileSymbolInventory[] = [];
for (const source of program.getSourceFiles()) {
  const path = source.fileName.replace(/^\//, "");
  if (!files[path]) continue;
  const analysis = extractFileSymbols(source);
  inventories.push({
    path,
    functions: analysis.inventory.functions,
    classes: analysis.inventory.classes,
    interfaces: analysis.inventory.interfaces,
    types: analysis.inventory.types,
    importsExports: analysis.inventory.importsExports,
  });
}
const parseMs = performance.now() - start,
  resolverStart = performance.now(),
  linker = new SymbolLinker(inventories, {}),
  references = linker.resolveAllReferences(inventories),
  resolutionMs = performance.now() - resolverStart,
  builder = new DependencyGraphBuilder(
    randomUUID(),
    Object.keys(files)
      .filter((p) => p.endsWith(".ts"))
      .map((path) => ({ path })),
  );
builder.addReferences(references);
const graph = builder.buildSnapshot();
assert.equal(graph.nodes.filter((node) => node.kind === "file").length, 1000);
assert.equal(graph.edges.length, 999);
assert.equal(graph.cycles.length, 0);
const full = extractVersion(files),
  incremental = extractVersion(files, full.snapshot, true);
assert.deepEqual(
  semanticVersion(full.snapshot),
  semanticVersion(incremental.snapshot),
);
const corrupted = structuredClone(full.snapshot);
corrupted.files[0].hash = "0".repeat(64);
const fallback = extractVersion(files, corrupted, true);
assert.deepEqual(
  semanticVersion(full.snapshot),
  semanticVersion(fallback.snapshot),
);
const totalMs = performance.now() - start,
  rssIncrease = Math.max(0, process.memoryUsage().rss - memory);
assert.ok(totalMs < 30000);
assert.ok(
  rssIncrease < 512 * 1024 * 1024,
  `RSS increase ${rssIncrease} exceeded budget`,
);
console.log(
  JSON.stringify({
    benchmark: "golden-modules",
    modules: 1000,
    expectedEdges: 999,
    actualEdges: graph.edges.length,
    parseMs,
    resolutionMs,
    totalMs,
    rssIncreaseBytes: rssIncrease,
    runtime: process.version,
    platform: process.platform,
    arch: process.arch,
  }),
);
