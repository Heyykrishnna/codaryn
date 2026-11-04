import ts from "typescript";
import type { SchemaLineage, SchemaTable } from "@codaryn/contracts";
import { evidence, identity } from "./model.js";
export function sourceLineage(
  files: Record<string, string>,
  tables: SchemaTable[],
): SchemaLineage[] {
  const result: SchemaLineage[] = [];
  for (const [path, source] of Object.entries(files)) {
    if (!/\.[cm]?[jt]sx?$/.test(path)) continue;
    const file = ts.createSourceFile(
      path,
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const associated = new Map<string, SchemaTable>();
    function calls(node: ts.Node) {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        const method = node.expression.name.text;
        const argument = node.arguments[0];
        if (
          ["from", "insert", "update", "delete"].includes(method) &&
          argument &&
          ts.isIdentifier(argument)
        ) {
          const candidates = tables.filter(
            (item) =>
              item.adapter === "drizzle" && item.modelName === argument.text,
          );
          if (candidates.length === 1) {
            const target = candidates[0];
            associated.set(target.id, target);
            result.push({
              id: identity(path, String(node.pos), target.id),
              kind: "repository",
              name: node.expression.getText(file),
              tableId: target.id,
              columnId: null,
              resolution: "INFERRED",
              evidence: evidence(path, source, node.getStart(file), node.end),
            });
          }
        }
      }
      ts.forEachChild(node, calls);
    }
    calls(file);
    function properties(node: ts.Node) {
      if (
        (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) &&
        node.name &&
        node.parent &&
        (ts.isInterfaceDeclaration(node.parent) ||
          ts.isClassDeclaration(node.parent))
      ) {
        const owner = node.parent.name?.text ?? "";
        const name = node.name.getText(file);
        if (!/(Dto|Request|Response)$/.test(owner)) return;
        for (const target of associated.values()) {
          const column = target.columns.find((item) => item.name === name);
          if (column)
            result.push({
              id: identity(path, owner, name, target.id),
              kind: "dto-field",
              name: `${owner}.${name}`,
              tableId: target.id,
              columnId: column.id,
              resolution: "INFERRED",
              evidence: evidence(path, source, node.getStart(file), node.end),
            });
        }
      }
      ts.forEachChild(node, properties);
    }
    properties(file);
  }
  return result;
}
