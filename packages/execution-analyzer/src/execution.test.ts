import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  extractExecution,
  executionPaths,
  executionNeighborhood,
} from "./index.js";
test("direct imports, methods, constructors and callback references link to actual definitions", () => {
  const { snapshot } = extractExecution({
    "a.ts":
      "export function double(n:number){return n*2;} export class Service { run(){return double(2);} }",
    "b.ts":
      "import {double as twice,Service} from './a'; export function main(cb:()=>number){const s=new Service(); s.run(); twice(4); [1].map(twice); cb(); unknown[key]();}",
  });
  for (const call of snapshot.calls.filter((c) => c.targetId))
    assert.ok(snapshot.functions.some((f) => f.id === call.targetId));
  assert.ok(
    snapshot.calls.some(
      (c) => c.expression === "twice" && c.kind === "call" && c.targetId,
    ),
  );
  assert.ok(snapshot.calls.some((c) => c.kind === "construct" && c.targetId));
  assert.ok(snapshot.calls.some((c) => c.expression === "s.run" && c.targetId));
  assert.ok(snapshot.calls.some((c) => c.kind === "callback" && c.targetId));
  assert.ok(snapshot.calls.some((c) => c.expression === "cb" && !c.targetId));
  assert.ok(
    snapshot.calls.some((c) => c.expression === "unknown[key]" && !c.targetId),
  );
});
test("control flow branches join, loops return and terminal returns do not fall through", () => {
  const { snapshot } = extractExecution({
    "a.ts":
      "function f(x:number){if(x>0){return 1;} else {x=2;} while(x<5){if(x===3)break; x++;continue;} return x; unreachable();}",
  });
  assert.ok(snapshot.controlNodes.some((n) => n.kind === "decision"));
  assert.ok(snapshot.controlNodes.some((n) => n.kind === "loop"));
  const returns = snapshot.controlNodes.filter((n) => n.kind === "return");
  assert.ok(returns.length >= 2);
  for (const returned of returns)
    for (const edge of snapshot.controlEdges.filter(
      (e) => e.sourceId === returned.id,
    ))
      assert.equal(
        snapshot.controlNodes.find((n) => n.id === edge.targetId)?.kind,
        "exit",
      );
  assert.ok(!snapshot.controlNodes.some((n) => n.label === "unreachable();"));
});
test("local values retain shadowing and explicit intraprocedural uncertainty", () => {
  const { snapshot } = extractExecution({
    "a.ts":
      "function f(a:number){const b=a; if(a){const b=2; console.log(b);} return b;} function g(){return 3;}",
  });
  const returned = snapshot.values.find(
    (v) => v.kind === "return" && v.evidence.path === "a.ts",
  );
  assert.ok(returned);
  assert.ok(
    snapshot.flows.some(
      (f) => f.targetId === returned.id && f.kind === "return",
    ),
  );
  for (const flow of snapshot.flows) {
    const a = snapshot.values.find((v) => v.id === flow.sourceId),
      b = snapshot.values.find((v) => v.id === flow.targetId);
    assert.equal(a?.functionId, b?.functionId);
  }
  assert.ok(snapshot.diagnostics.some((d) => d.code === "DATA_FLOW_SCOPE"));
});
test("paths are cycle-safe, bounded and exclude deferred callback references", () => {
  const { snapshot } = extractExecution({
    "a.ts":
      "function a(){b();}function b(){a();c();}function c(){return 1;} function defer(){register(c);}",
  });
  const a = snapshot.functions.find((f) => f.name === "a")!,
    c = snapshot.functions.find((f) => f.name === "c")!,
    defer = snapshot.functions.find((f) => f.name === "defer")!;
  const result = executionPaths(snapshot, a.id, c.id);
  assert.equal(result.paths.length, 1);
  assert.equal(result.paths[0].length, 3);
  assert.equal(result.semantics, "potential-static");
  assert.equal(executionPaths(snapshot, defer.id, c.id).paths.length, 0);
  assert.ok(
    executionNeighborhood(snapshot, a.id, 2).functions.some(
      (f) => f.id === c.id,
    ),
  );
  assert.throws(() => executionPaths(snapshot, a.id, c.id, 13));
});
test("framework entry points and opaque exception regions carry evidence", () => {
  const { snapshot } = extractExecution({
    "app/api/users/route.ts":
      "export function GET(){try{return load();}finally{cleanup();}}",
    "server.ts":
      "import express from 'express'; const app=express(); app.get('/users',()=>read());",
  });
  assert.ok(snapshot.entries.some((e) => e.kind === "next-route"));
  assert.ok(snapshot.entries.some((e) => e.kind === "http-handler"));
  assert.ok(snapshot.diagnostics.some((d) => d.code === "CONTROL_PARTIAL"));
});
test("source order is deterministic, executable code is never evaluated and unsafe paths are rejected", () => {
  const files = {
    "z.ts": "throw new Error('must not execute'); export const f=()=>1;",
    "a.ts": "export function g(){return 2;}",
  };
  assert.equal(
    extractExecution(files).hash,
    extractExecution({ "a.ts": files["a.ts"], "z.ts": files["z.ts"] }).hash,
  );
  assert.throws(() => extractExecution({ "../outside.ts": "" }));
  assert.throws(() => extractExecution({ "/outside.ts": "" }));
  const { snapshot } = extractExecution({
    "a.ts": "import {secret} from '/etc/secret'; function run(){secret();}",
  });
  assert.ok(snapshot.calls.every((c) => !c.targetId));
});

test("mutable, parameterized and union-valued functions do not acquire an unsupported implementation target", () => {
  const { snapshot } = extractExecution({
    "a.ts":
      "function a(){return 1;} function b(){return 2;} let fn=a; fn=b; fn(); function dispatch(cb:typeof a){cb();} const choice=Math.random()?a:b; choice();",
  });
  for (const name of ["fn", "cb", "choice"])
    assert.ok(
      snapshot.calls.some(
        (call) => call.expression === name && call.targetId === null,
      ),
    );
});

test("malformed source is quarantined and expression-level control limitations are visible", () => {
  const { snapshot } = extractExecution({
    "broken.ts": "export function broken( {",
    "safe.ts": "export function choose(a:boolean){return a?1:2;}",
  });
  assert.ok(
    snapshot.diagnostics.some((d) => d.code === "SOURCE_PARSE_PARTIAL"),
  );
  assert.ok(!snapshot.functions.some((fn) => fn.evidence.path === "broken.ts"));
  assert.ok(
    snapshot.diagnostics.some((d) => d.code === "CONTROL_EXPRESSION_PARTIAL"),
  );
});
test("switch fallthrough and loop jumps remain explicit potential control transitions", () => {
  const { snapshot } = extractExecution({
    "a.ts":
      "function f(x:number){switch(x){case 1:x++;case 2:break;default:return 0;} for(let i=0;i<x;i++){if(i===1)continue;break;} do{x--;}while(x>0);return x;}",
  });
  assert.ok(snapshot.controlEdges.some((edge) => edge.label === "case 1"));
  assert.ok(snapshot.controlEdges.some((edge) => edge.label === "continue"));
  assert.ok(snapshot.controlEdges.some((edge) => edge.label === "break"));
  assert.equal(
    snapshot.controlNodes.filter((node) => node.kind === "loop").length,
    2,
  );
});
test("local assignments flow to later reads without merging a shadowed binding", () => {
  const { snapshot } = extractExecution({
    "a.ts":
      "function f(a:number){\nlet value=a;\n{let value=2; consume(value); }\nvalue=a+1;\nreturn value;\n}",
  });
  const read = snapshot.values.find(
    (value) =>
      value.kind === "read" &&
      value.name === "value" &&
      value.evidence.startLine === 5,
  )!;
  assert.ok(read);
  const sources = snapshot.flows
    .filter((flow) => flow.targetId === read.id && flow.kind === "may-reach")
    .map(
      (flow) =>
        snapshot.values.find((value) => value.id === flow.sourceId)!.evidence
          .startLine,
    );
  assert.deepEqual(
    sources.sort((a, b) => a - b),
    [2, 4],
  );
  assert.ok(
    snapshot.values.some(
      (value) => value.kind === "assignment" && value.evidence.startLine === 4,
    ),
  );
});
