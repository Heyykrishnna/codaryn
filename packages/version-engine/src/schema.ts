import { extractSchema } from "@codaryn/schema-engine";
import type { VersionSnapshot } from "@codaryn/contracts";
import { digest, label } from "./file.js";
export function schemaProjection(files: Record<string, string>) {
  const snapshot = extractSchema(files).snapshot,
    objects: VersionSnapshot["schema"] = [];
  for (const table of snapshot.tables) {
    const key = `${table.adapter}:${table.namespace}.${table.name}`;
    objects.push({
      id: digest(["table", key]),
      kind: "table",
      name: label(key),
      hash: digest([table.adapter, table.namespace, table.name]),
      evidence: table.evidence,
    });
    for (const column of table.columns)
      objects.push({
        id: digest(["column", key, column.name]),
        kind: "column",
        name: label(`${key}.${column.name}`),
        hash: digest([
          column.type,
          column.nullable,
          column.defaultValue,
          column.primaryKey,
          column.unique,
        ]),
        evidence: column.evidence,
      });
    for (const constraint of table.constraints)
      objects.push({
        id: digest(["constraint", key, constraint.name]),
        kind: "constraint",
        name: label(`${key}.${constraint.name}`),
        hash: digest([
          constraint.kind,
          constraint.columns,
          constraint.expression,
        ]),
        evidence: constraint.evidence,
      });
  }
  const tables = new Map(
    snapshot.tables.map((table) => [
      table.id,
      `${table.adapter}:${table.namespace}.${table.name}`,
    ]),
  );
  for (const edge of snapshot.relations)
    objects.push({
      id: digest(["relation", tables.get(edge.sourceTableId), edge.name]),
      kind: "relation",
      name: label(edge.name),
      hash: digest([
        tables.get(edge.sourceTableId),
        tables.get(edge.targetTableId ?? ""),
        edge.columns,
        edge.targetColumns,
        edge.resolution,
        edge.cardinality,
        edge.onDelete,
      ]),
      evidence: edge.evidence,
    });
  for (const item of snapshot.enums)
    objects.push({
      id: digest(["enum", item.adapter, item.name]),
      kind: "enum",
      name: label(item.name),
      hash: digest(item.values),
      evidence: item.evidence,
    });
  return {
    schema: objects.sort((a, b) => a.id.localeCompare(b.id)),
    schemaDiagnostics: snapshot.diagnostics.length,
  };
}
