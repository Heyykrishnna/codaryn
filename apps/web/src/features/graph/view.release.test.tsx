import { test } from "node:test";
import { strict as assert } from "node:assert";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DependencyGraphView } from "./view";
test("large graph rendering stays bounded and exposes keyboard-accessible controls", () => {
  const nodes = Array.from({ length: 10000 }, (_, index) => ({
      id: `node:${index}`,
      jobId: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
      kind: "file" as const,
      path: `src/module${index}.ts`,
      name: `module${index}`,
    })),
    edges = Array.from({ length: 9999 }, (_, index) => ({
      id: `edge:${index}`,
      jobId: nodes[0].jobId,
      sourceId: nodes[index].id,
      targetId: nodes[index + 1].id,
      kind: "imports" as const,
      resolution: "DIRECT" as const,
      evidence: [{ path: nodes[index].path, startLine: 1, endLine: 1 }],
      weight: 1,
    })),
    start = performance.now(),
    markup = renderToStaticMarkup(
      <DependencyGraphView nodes={nodes} edges={edges} />,
    ),
    duration = performance.now() - start;
  assert.equal((markup.match(/aria-label="Select src\//g) ?? []).length, 200);
  assert.equal(
    (markup.match(/aria-label="Inspect relationship/g) ?? []).length,
    199,
  );
  assert.ok(markup.includes('tabindex="0"'));
  assert.ok(markup.includes('role="button"'));
  assert.ok(markup.includes("Filter graph nodes"));
  assert.ok(markup.includes('aria-pressed="false"'));
  assert.ok(Buffer.byteLength(markup) < 1048576);
  assert.ok(duration < 2000);
  console.log(
    JSON.stringify({
      measurement: "bounded-graph-render",
      inputNodes: 10000,
      renderedNodes: 200,
      renderedEdges: 199,
      htmlBytes: Buffer.byteLength(markup),
      durationMs: duration,
      runtime: process.version,
    }),
  );
});
