import ts from "typescript";
import type { ExecutionSnapshot } from "@codaryn/contracts";
import { evidence, identifier, label, bounded } from "./model.js";
import type { FunctionIndex } from "./functions.js";
export function collectEntries(
  index: FunctionIndex,
  result: ExecutionSnapshot,
) {
  for (const [functionId, node] of index.nodes) {
    if (ts.isSourceFile(node) || ts.isClassDeclaration(node)) continue;
    const path = node.getSourceFile().fileName;
    const modifiers = ts.canHaveModifiers(node)
      ? ts.getModifiers(node)
      : undefined;
    const exported =
      modifiers?.some((item) => item.kind === ts.SyntaxKind.ExportKeyword) ||
      (ts.isVariableDeclaration(node.parent) &&
        ts.isVariableDeclarationList(node.parent.parent) &&
        ts.isVariableStatement(node.parent.parent.parent) &&
        node.parent.parent.parent.modifiers?.some(
          (item) => item.kind === ts.SyntaxKind.ExportKeyword,
        ));
    if (exported)
      result.entries.push({
        id: identifier(node, "export-entry"),
        functionId,
        kind: "export",
        label: "Exported declaration; external invocation not guaranteed",
        evidence: evidence(node),
      });
    const name = index.byNode.get(node)?.name ?? "";
    if (
      /(^|\/)app\/(.*\/)?route\.[jt]sx?$/.test(path) &&
      ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
        name,
      )
    )
      result.entries.push({
        id: identifier(node, "next-entry"),
        functionId,
        kind: "next-route",
        label: `Next route ${name}`,
        evidence: evidence(node),
      });
    if (
      ts.canHaveDecorators(node) &&
      ts
        .getDecorators(node)
        ?.some((item) =>
          /^@(Get|Post|Put|Patch|Delete|Head|Options)\b/.test(label(item)),
        )
    )
      result.entries.push({
        id: identifier(node, "nest-entry"),
        functionId,
        kind: "nest-handler",
        label: "Decorated HTTP handler; framework registration is potential",
        evidence: evidence(node),
      });
    bounded(result);
  }
  const callbacks = new Map(
    result.calls
      .filter((call) => call.kind === "callback")
      .map((call) => [call.id, call]),
  );
  function registrations(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ["get", "post", "put", "patch", "delete", "route", "all", "use"].includes(
        node.expression.name.text,
      ) &&
      /from\s*["'](?:express|fastify)["']/.test(node.getSourceFile().text)
    ) {
      for (const argument of node.arguments) {
        const call = callbacks.get(identifier(argument, "callback-reference"));
        if (call?.targetId)
          result.entries.push({
            id: `${call.id}:entry`,
            functionId: call.targetId,
            kind: "http-handler",
            label:
              "Potential HTTP handler registration; static receiver matching",
            evidence: call.evidence,
          });
      }
    }
    ts.forEachChild(node, registrations);
  }
  for (const node of index.nodes.values())
    if (ts.isSourceFile(node)) registrations(node);
  bounded(result);
}
