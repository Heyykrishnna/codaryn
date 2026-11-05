import ts from "typescript";
import type { ExecutionFunction, ExecutionSnapshot } from "@codaryn/contracts";
import { evidence, identifier, label, bounded } from "./model.js";
import type { FunctionIndex } from "./functions.js";
function resolveSymbol(checker: ts.TypeChecker, node: ts.Node) {
  const symbol = checker.getSymbolAtLocation(node);
  return symbol && symbol.flags & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;
}
function symbolTarget(
  checker: ts.TypeChecker,
  node: ts.Node,
  index: FunctionIndex,
) {
  const symbol = resolveSymbol(checker, node);
  const matches = (symbol?.declarations ?? []).flatMap((declaration) => {
    const direct = index.byNode.get(declaration);
    if (direct) return [direct];
    if (ts.isVariableDeclaration(declaration) && declaration.initializer) {
      const target = index.byNode.get(declaration.initializer);
      return target ? [target] : [];
    }
    return [];
  });
  return matches.length === 1 ? matches[0] : undefined;
}
function unsupportedBinding(checker: ts.TypeChecker, node: ts.Node) {
  if (ts.isParameter(node)) return true;
  if (!ts.isVariableDeclaration(node)) return false;
  if (
    !ts.isVariableDeclarationList(node.parent) ||
    !(node.parent.flags & ts.NodeFlags.Const)
  )
    return true;
  const initial = node.initializer;
  if (!initial) return true;
  if (ts.isArrowFunction(initial) || ts.isFunctionExpression(initial))
    return false;
  if (ts.isIdentifier(initial))
    return !resolveSymbol(checker, initial)?.declarations?.some(
      ts.isFunctionDeclaration,
    );
  return true;
}
function callTarget(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression,
  index: FunctionIndex,
) {
  const type = checker.getTypeAtLocation(node.expression);
  if (
    type.flags &
    (ts.TypeFlags.Any |
      ts.TypeFlags.Unknown |
      ts.TypeFlags.Union |
      ts.TypeFlags.Intersection |
      ts.TypeFlags.TypeParameter)
  )
    return undefined;
  const symbol = resolveSymbol(checker, node.expression);
  if (
    symbol?.declarations?.some((declaration) =>
      unsupportedBinding(checker, declaration),
    )
  )
    return undefined;

  if (
    ts.isElementAccessExpression(node.expression) &&
    !ts.isStringLiteral(node.expression.argumentExpression)
  )
    return undefined;
  const signature = checker.getResolvedSignature(node)?.declaration;
  const direct = signature ? index.byNode.get(signature) : undefined;
  if (direct) return direct;
  const target = symbolTarget(checker, node.expression, index);
  if (!target) return undefined;
  if (target.kind !== "constructor" || ts.isNewExpression(node)) return target;
  return undefined;
}
export function collectCalls(
  program: ts.Program,
  index: FunctionIndex,
  result: ExecutionSnapshot,
) {
  const checker = program.getTypeChecker();
  function visit(node: ts.Node, owner: ExecutionFunction) {
    const current = index.byNode.get(node) ?? owner;
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const target = callTarget(checker, node, index);
      result.calls.push({
        id: identifier(node, "call"),
        sourceId: current.id,
        targetId: target?.id ?? null,
        expression: label(node.expression),
        kind: ts.isNewExpression(node) ? "construct" : "call",
        resolution: target ? "RESOLVED" : "UNRESOLVED",
        reason: target
          ? "Statically declared target; dispatch and invocation remain potential."
          : "Dynamic, external, parameterized or unsupported target; no implementation asserted.",
        evidence: evidence(node),
      });
      for (const argument of node.arguments ?? []) {
        const callback =
          index.byNode.get(argument) ?? symbolTarget(checker, argument, index);
        if (callback)
          result.calls.push({
            id: identifier(argument, "callback-reference"),
            sourceId: current.id,
            targetId: callback.id,
            expression: label(argument),
            kind: "callback",
            resolution: "RESOLVED",
            reason:
              "Function passed as a value; invocation, timing and frequency are unknown.",
            evidence: evidence(argument),
          });
      }
      bounded(result);
    }
    ts.forEachChild(node, (child) => visit(child, current));
  }
  for (const sf of program.getSourceFiles()) {
    const module = index.byNode.get(sf);
    if (module) visit(sf, module);
  }
}
