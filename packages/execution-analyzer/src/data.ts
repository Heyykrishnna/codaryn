import ts from "typescript";
import type { ExecutionSnapshot, ExecutionValue } from "@codaryn/contracts";
import {
  callable,
  evidence,
  identifier,
  label,
  bounded,
  diagnostic,
} from "./model.js";
function binding(checker: ts.TypeChecker, node: ts.Node) {
  return ts.isIdentifier(node) ? checker.getSymbolAtLocation(node) : undefined;
}
function isRead(node: ts.Identifier) {
  const p = node.parent;
  if (
    (ts.isPropertyAccessExpression(p) && p.name === node) ||
    (ts.isPropertyAssignment(p) &&
      p.name === node &&
      !ts.isShorthandPropertyAssignment(p))
  )
    return false;
  if (
    (ts.isVariableDeclaration(p) || ts.isParameter(p) || callable(p)) &&
    p.name === node
  )
    return false;
  if (
    ts.isBinaryExpression(p) &&
    p.left === node &&
    p.operatorToken.kind === ts.SyntaxKind.EqualsToken
  )
    return false;
  return !ts.isTypeNode(p);
}
export function collectData(
  program: ts.Program,
  nodes: Map<string, ts.Node>,
  result: ExecutionSnapshot,
) {
  const checker = program.getTypeChecker();
  for (const [functionId, root] of nodes) {
    if (!callable(root) || !root.body) continue;
    const definitions = new Map<
        ts.Symbol,
        { value: ExecutionValue; position: number }[]
      >(),
      reads: { symbol: ts.Symbol; value: ExecutionValue; position: number }[] =
        [];
    function value(node: ts.Node, kind: ExecutionValue["kind"], name: string) {
      const item = {
        id: identifier(node, `${functionId}:${kind}`),
        functionId,
        name,
        kind,
        evidence: evidence(node),
      };
      result.values.push(item);
      bounded(result);
      return item;
    }
    function edge(
      source: ExecutionValue,
      target: ExecutionValue,
      kind: "may-reach" | "expression" | "return",
    ) {
      result.flows.push({
        id: `${source.id}->${target.id}:${kind}`,
        functionId,
        sourceId: source.id,
        targetId: target.id,
        kind,
      });
      bounded(result);
    }
    function define(
      name: ts.Node,
      node: ts.Node,
      kind: "parameter" | "definition" | "assignment",
      expression?: ts.Expression,
    ) {
      const symbol = binding(checker, name);
      if (!symbol) {
        diagnostic(
          result,
          node,
          "DATA_BINDING_PARTIAL",
          "Destructuring and property writes are outside scalar local binding flow.",
        );
        return;
      }
      const target = value(node, kind, label(name));
      const prior = definitions.get(symbol) ?? [];
      prior.push({ value: target, position: node.getStart() });
      definitions.set(symbol, prior);
      if (expression)
        for (const read of scanExpression(expression))
          edge(read, target, "expression");
    }
    function scanExpression(expression: ts.Node): ExecutionValue[] {
      const found: ExecutionValue[] = [];
      function visit(node: ts.Node) {
        if (callable(node)) return;
        if (ts.isIdentifier(node) && isRead(node)) {
          const symbol = binding(checker, node);
          if (symbol) {
            const item = value(node, "read", node.text);
            reads.push({ symbol, value: item, position: node.getStart() });
            found.push(item);
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(expression);
      return found;
    }
    function visit(node: ts.Node) {
      if (callable(node) && node !== root) return;
      if (ts.isVariableDeclaration(node)) {
        define(node.name, node, "definition", node.initializer);
        return;
      }
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
        node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
      ) {
        define(node.left, node, "assignment", node.right);
        return;
      }
      if (ts.isReturnStatement(node) && node.expression) {
        const target = value(node, "return", "return");
        for (const read of scanExpression(node.expression))
          edge(read, target, "return");
        return;
      }
      if (ts.isExpressionStatement(node)) {
        scanExpression(node.expression);
        return;
      }
      ts.forEachChild(node, visit);
    }
    for (const parameter of root.parameters)
      define(parameter.name, parameter, "parameter", parameter.initializer);
    visit(root.body);
    for (const read of reads)
      for (const definition of definitions.get(read.symbol) ?? [])
        if (
          definition.position <= read.position &&
          definition.value.id !== read.value.id
        )
          edge(definition.value, read.value, "may-reach");
    diagnostic(
      result,
      root,
      "DATA_FLOW_SCOPE",
      "Scalar local bindings only; may-reach edges are conservative, not SSA, taint proof or interprocedural flow. Aliasing, mutation through calls and loop-carried definitions are not solved.",
    );
  }
}
