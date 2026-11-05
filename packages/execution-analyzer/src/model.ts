import ts from "typescript";
import type { ExecutionSnapshot, SourceEvidence } from "@codaryn/contracts";
export type Callable =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.ConstructorDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration;
export function callable(node: ts.Node): node is Callable {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}
export function evidence(node: ts.Node): SourceEvidence {
  const sf = node.getSourceFile();
  return {
    path: sf.fileName.replace(/^\/+/, ""),
    startLine: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
    endLine: sf.getLineAndCharacterOfPosition(node.end).line + 1,
  };
}
export function identifier(node: ts.Node, kind: string) {
  return `${node.getSourceFile().fileName.replace(/^\/+/, "")}:${node.getStart()}:${kind}`;
}
export function label(node: ts.Node) {
  return node.getText().slice(0, 300);
}
export function emptySnapshot(): ExecutionSnapshot {
  return {
    version: 1,
    semantics: "potential-static",
    functions: [],
    calls: [],
    controlNodes: [],
    controlEdges: [],
    values: [],
    flows: [],
    entries: [],
    diagnostics: [],
  };
}
export function diagnostic(
  result: ExecutionSnapshot,
  node: ts.Node,
  code: string,
  message: string,
) {
  if (result.diagnostics.length >= 10000)
    throw new Error("Execution diagnostic limit exceeded");
  result.diagnostics.push({ code, message, evidence: evidence(node) });
}
export function bounded(result: ExecutionSnapshot) {
  const limits: [number, number][] = [
    [result.functions.length, 10000],
    [result.calls.length, 50000],
    [result.controlNodes.length, 50000],
    [result.controlEdges.length, 100000],
    [result.values.length, 50000],
    [result.flows.length, 100000],
    [result.entries.length, 10000],
  ];
  if (limits.some(([count, limit]) => count > limit))
    throw new Error("Execution object limit exceeded");
}
