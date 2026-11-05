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
    const parent = node.parent;
    if (
      ts.isCallExpression(parent) &&
      ts.isPropertyAccessExpression(parent.expression) &&
      ["get", "post", "put", "patch", "delete", "route", "all", "use"].includes(
        parent.expression.name.text,
      ) &&
      /from\s*["'](?:express|fastify)["']/.test(parent.getSourceFile().text)
    )
      result.entries.push({
        id: identifier(node, "http-entry"),
        functionId,
        kind: "http-handler",
        label: `Potential HTTP ${parent.expression.name.text} handler registration`,
        evidence: evidence(node),
      });
    bounded(result);
  }
  for (const call of result.calls.filter(
    (item) => item.kind === "callback" && item.targetId,
  )) {
    const source = index.nodes.get(call.sourceId)?.getSourceFile();
    if (source && /from\s*["'](?:express|fastify)["']/.test(source.text)) {
      const targetId = call.targetId;
      if (targetId)
        result.entries.push({
          id: `${call.id}:entry`,
          functionId: targetId,
          kind: "http-handler",
          label:
            "Callback reference in an HTTP framework file; verify registration",
          evidence: call.evidence,
        });
    }
  }
}
