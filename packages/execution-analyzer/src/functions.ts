import ts from "typescript";
import type { ExecutionFunction, ExecutionSnapshot } from "@codaryn/contracts";
import {
  callable,
  evidence,
  identifier,
  label,
  bounded,
  type Callable,
} from "./model.js";
export type FunctionIndex = {
  byNode: Map<ts.Node, ExecutionFunction>;
  nodes: Map<string, ts.Node>;
};
function functionName(node: Callable) {
  if (node.name) return label(node.name);
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if (
    ts.isVariableDeclaration(node.parent) ||
    ts.isPropertyAssignment(node.parent)
  )
    return label(node.parent.name);
  return `callback@${evidence(node).startLine}:${node.getStart()}`;
}
function kind(node: Callable): ExecutionFunction["kind"] {
  if (ts.isConstructorDeclaration(node)) return "constructor";
  if (
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  )
    return "method";
  if (ts.isFunctionDeclaration(node)) return "function";
  return "callback";
}
export function collectFunctions(
  program: ts.Program,
  result: ExecutionSnapshot,
): FunctionIndex {
  const byNode = new Map<ts.Node, ExecutionFunction>(),
    nodes = new Map<string, ts.Node>();
  const add = (node: ts.Node, value: ExecutionFunction) => {
    byNode.set(node, value);
    nodes.set(value.id, node);
    result.functions.push(value);
    bounded(result);
  };
  function visit(node: ts.Node) {
    if (callable(node) && node.body)
      add(node, {
        id: identifier(node, "function"),
        name: functionName(node),
        kind: kind(node),
        parameters: node.parameters.map((p) => label(p.name)),
        async: !!node.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.AsyncKeyword,
        ),
        evidence: evidence(node),
      });
    if (
      ts.isClassDeclaration(node) &&
      !node.members.some(ts.isConstructorDeclaration)
    )
      add(node, {
        id: identifier(node, "constructor"),
        name: `${node.name?.text ?? "anonymous"}.constructor`,
        kind: "constructor",
        parameters: [],
        async: false,
        evidence: evidence(node),
      });
    ts.forEachChild(node, visit);
  }
  for (const sf of program.getSourceFiles()) {
    add(sf, {
      id: identifier(sf, "module"),
      name: sf.fileName,
      kind: "module",
      parameters: [],
      async: false,
      evidence: evidence(sf),
    });
    visit(sf);
  }
  return { byNode, nodes };
}
