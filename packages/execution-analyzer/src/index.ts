import { createHash } from "node:crypto";
import { executionSnapshotSchema } from "@codaryn/contracts";
import { createExecutionProgram } from "./program.js";
import { emptySnapshot, bounded } from "./model.js";
import { collectFunctions } from "./functions.js";
import { collectCalls } from "./calls.js";
import { collectControl } from "./control.js";
import { collectData } from "./data.js";
import { collectEntries } from "./entries.js";
export { executionPaths, executionNeighborhood } from "./queries.js";
export function extractExecution(files: Record<string, string>) {
  const program = createExecutionProgram(files),
    snapshot = emptySnapshot();
  const index = collectFunctions(program, snapshot);
  collectCalls(program, index, snapshot);
  collectControl(snapshot, index.nodes);
  collectData(program, index.nodes, snapshot);
  collectEntries(index, snapshot);
  bounded(snapshot);
  for (const list of [
    snapshot.functions,
    snapshot.calls,
    snapshot.controlNodes,
    snapshot.controlEdges,
    snapshot.values,
    snapshot.flows,
    snapshot.entries,
  ])
    list.sort((a, b) => a.id.localeCompare(b.id));
  const parsed = executionSnapshotSchema.parse(snapshot);
  return {
    snapshot: parsed,
    hash: createHash("sha256").update(JSON.stringify(parsed)).digest("hex"),
  };
}

export function extractCallIndex(files: Record<string, string>) {
  const program = createExecutionProgram(files),
    snapshot = emptySnapshot(),
    index = collectFunctions(program, snapshot);
  collectCalls(program, index, snapshot);
  return {
    functions: snapshot.functions,
    calls: snapshot.calls,
    diagnostics: snapshot.diagnostics,
  };
}
