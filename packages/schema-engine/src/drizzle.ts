import ts from "typescript";
import type { SchemaTable } from "@codaryn/contracts";
import {
  emptyExtraction,
  table,
  identity,
  evidence,
  diagnostic,
  type Extraction,
} from "./model.js";
export type DrizzleExtraction = Extraction & { bindings: Map<string, string> };
function literal(node: ts.Node | undefined): string | undefined {
  return node && (ts.isStringLiteral(node) || ts.isNumericLiteral(node))
    ? node.text
    : undefined;
}
function chain(node: ts.Expression) {
  const calls: ts.CallExpression[] = [];
  let current = node;
  while (ts.isCallExpression(current)) {
    calls.push(current);
    current = ts.isPropertyAccessExpression(current.expression)
      ? current.expression.expression
      : current.expression;
  }
  return { calls, root: calls[calls.length - 1] };
}
const callName = (call: ts.CallExpression) =>
  ts.isPropertyAccessExpression(call.expression)
    ? call.expression.name.text
    : ts.isIdentifier(call.expression)
      ? call.expression.text
      : "";
function properties(node: ts.Node | undefined) {
  return node && ts.isObjectLiteralExpression(node)
    ? node.properties.filter(ts.isPropertyAssignment)
    : [];
}
function values(node: ts.Node | undefined): readonly ts.Expression[] {
  return node && ts.isArrayLiteralExpression(node) ? node.elements : [];
}
function columnNames(nodes: readonly ts.Node[]) {
  return nodes
    .filter((item): item is ts.PropertyAccessExpression =>
      ts.isPropertyAccessExpression(item),
    )
    .map((node) => node.name.text);
}
export function extractDrizzle(
  path: string,
  source: string,
): DrizzleExtraction {
  const result: DrizzleExtraction = {
    ...emptyExtraction(),
    bindings: new Map(),
  };
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const factories = new Map<string, string>();
  const imports = new Map<string, string>();
  const namespaces = new Map<string, string>();
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      for (const item of bindings.elements) {
        const original = item.propertyName?.text ?? item.name.text;
        if (statement.moduleSpecifier.text.startsWith("drizzle-orm"))
          factories.set(item.name.text, original);
        else imports.set(item.name.text, statement.moduleSpecifier.text);
      }
  }
  const baseName = (call: ts.CallExpression) =>
    factories.get(callName(call)) ?? callName(call);
  const refTarget = (node: ts.PropertyAccessExpression) => {
    const variable = node.expression.getText(file);
    const module = imports.get(variable);
    return module ? `${module}:${variable}` : variable;
  };
  function addRelation(
    target: SchemaTable,
    columns: string[],
    foreign: ts.PropertyAccessExpression[],
    node: ts.Node,
    onDelete: string | null = null,
  ) {
    if (!foreign.length) return;
    const name = `${target.name}_${columns.join("_")}_fkey`;
    result.relations.push({
      id: identity(target.id, name),
      name,
      sourceTableId: target.id,
      targetTableId: null,
      targetName: refTarget(foreign[0]),
      columns,
      targetColumns: foreign.map((item) => item.name.text),
      cardinality: "one-to-many",
      resolution: "DIRECT",
      onDelete,
      evidence: evidence(path, source, node.getStart(file), node.end),
    });
    target.constraints.push({
      id: identity(target.id, name),
      name,
      kind: "foreign-key",
      columns,
      expression: null,
      evidence: result.relations[result.relations.length - 1].evidence,
    });
  }
  function addColumn(target: SchemaTable, property: ts.PropertyAssignment) {
    const { calls, root } = chain(property.initializer);
    if (!root) return;
    const type = baseName(root);
    if (
      !ts.isIdentifier(root.expression) &&
      !ts.isPropertyAccessExpression(root.expression)
    )
      return;
    const name =
      literal(root.arguments[0]) ??
      property.name.getText(file).replace(/^['"]|['"]$/g, "");
    const modifiers = calls.map(callName);
    const initial = calls.find((item) => callName(item) === "default");
    const defaultNow = modifiers.includes("defaultNow");
    const types: Record<string, string> = {
      serial: "serial",
      bigserial: "bigserial",
      text: "text",
      varchar: "varchar",
      integer: "integer",
      int: "integer",
      bigint: "bigint",
      boolean: "boolean",
      timestamp: "timestamp",
      date: "date",
      numeric: "numeric",
      decimal: "decimal",
      real: "real",
      doublePrecision: "double precision",
      uuid: "uuid",
      json: "json",
      jsonb: "jsonb",
      blob: "blob",
    };
    const primary = modifiers.includes("primaryKey");
    const column = {
      id: identity(target.id, name),
      name,
      type: (types[type] ?? type) + (modifiers.includes("array") ? "[]" : ""),
      nullable: !primary && !modifiers.includes("notNull"),
      primaryKey: primary,
      unique: modifiers.includes("unique"),
      defaultValue: initial
        ? (initial.arguments[0]?.getText(file).slice(0, 4096) ?? null)
        : defaultNow
          ? "now()"
          : null,
      evidence: evidence(path, source, property.getStart(file), property.end),
    };
    target.columns.push(column);
    result.bindings.set(`${target.id}:${property.name.getText(file)}`, name);
    for (const kind of [
      primary ? "primary-key" : null,
      column.unique ? "unique" : null,
    ] as const)
      if (kind)
        target.constraints.push({
          id: identity(target.id, kind, name),
          name: `${target.name}_${name}_${kind}`,
          kind,
          columns: [name],
          expression: null,
          evidence: column.evidence,
        });
    const references = calls.find((item) => callName(item) === "references");
    if (references) {
      const arrow = references.arguments[0];
      if (
        arrow &&
        ts.isArrowFunction(arrow) &&
        ts.isPropertyAccessExpression(arrow.body)
      ) {
        const options = properties(references.arguments[1]);
        addRelation(
          target,
          [name],
          [arrow.body],
          references,
          literal(
            options.find((item) => item.name.getText(file) === "onDelete")
              ?.initializer,
          ) ?? null,
        );
      } else
        diagnostic(
          result,
          path,
          source,
          references.pos,
          "DRIZZLE_DYNAMIC",
          "Dynamic reference was not resolved.",
        );
    }
    if (!types[type] && !factories.has(type))
      diagnostic(
        result,
        path,
        source,
        property.pos,
        "DRIZZLE_TYPE",
        `Custom builder ${type} requires source review.`,
      );
  }
  function constraints(target: SchemaTable, node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const name = baseName(node);
      const kinds: Record<
        string,
        "primary-key" | "unique" | "index" | "check"
      > = {
        primaryKey: "primary-key",
        unique: "unique",
        uniqueIndex: "unique",
        index: "index",
        check: "check",
      };
      const kind = kinds[name];
      if (kind) {
        const on =
          ts.isPropertyAccessExpression(node.parent) &&
          ts.isCallExpression(node.parent.parent) &&
          node.parent.name.text === "on"
            ? node.parent.parent
            : undefined;
        const options = properties(node.arguments[0]);
        const columns = columnNames(
          on?.arguments ??
            values(
              options.find((item) => item.name.getText(file) === "columns")
                ?.initializer,
            ),
        ).map((name) => result.bindings.get(`${target.id}:${name}`) ?? name);
        const label =
          literal(node.arguments[0]) ??
          `${target.name}_${kind}_${columns.join("_")}`;
        target.constraints.push({
          id: identity(target.id, label),
          name: label,
          kind,
          columns,
          expression:
            kind === "check"
              ? (node.arguments[1]?.getText(file).slice(0, 4096) ?? null)
              : null,
          evidence: evidence(path, source, node.getStart(file), node.end),
        });
      }
      if (name === "foreignKey") {
        const options = properties(node.arguments[0]);
        const columns = columnNames(
          values(
            options.find((item) => item.name.getText(file) === "columns")
              ?.initializer,
          ),
        ).map((name) => result.bindings.get(`${target.id}:${name}`) ?? name);
        const foreign = values(
          options.find((item) => item.name.getText(file) === "foreignColumns")
            ?.initializer,
        ).filter((item): item is ts.PropertyAccessExpression =>
          ts.isPropertyAccessExpression(item),
        );
        addRelation(target, columns, foreign, node);
      }
    }
    ts.forEachChild(node, (child) => constraints(target, child));
  }
  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer)
    ) {
      const call = node.initializer;
      const factory = baseName(call);
      const first = literal(call.arguments[0]);
      if (factory === "pgSchema" && first)
        namespaces.set(node.name.text, first);
      if (factory === "pgEnum" && first) {
        result.enums.push({
          id: identity("drizzle", path, first),
          name: first,
          adapter: "drizzle",
          values: values(call.arguments[1])
            .map((item) => literal(item))
            .filter((item): item is string => item !== undefined),
          evidence: evidence(path, source, node.getStart(file), node.end),
        });
      }
      const schemaName = ts.isPropertyAccessExpression(call.expression)
        ? namespaces.get(call.expression.expression.getText(file))
        : undefined;
      if (
        ["pgTable", "mysqlTable", "sqliteTable"].includes(factory) ||
        (factory === "table" && schemaName)
      ) {
        if (
          !first ||
          !call.arguments[1] ||
          !ts.isObjectLiteralExpression(call.arguments[1])
        ) {
          diagnostic(
            result,
            path,
            source,
            node.pos,
            "DRIZZLE_DYNAMIC",
            "Dynamic table declarations are not evaluated.",
          );
          return;
        }
        const target = table(
          "drizzle",
          first,
          path,
          source,
          node.getStart(file),
          node.end,
          schemaName,
        );
        target.modelName = node.name.text;
        result.bindings.set(node.name.text, target.id);
        for (const property of call.arguments[1].properties) {
          if (ts.isPropertyAssignment(property)) addColumn(target, property);
          else
            diagnostic(
              result,
              path,
              source,
              property.pos,
              "DRIZZLE_DYNAMIC",
              "Spread and computed column declarations are unsupported.",
            );
        }
        if (call.arguments[2]) constraints(target, call.arguments[2]);
        result.tables.push(target);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return result;
}
