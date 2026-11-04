import type { SchemaComparison, SchemaSnapshot } from "@codaryn/contracts";
function objects(snapshot: SchemaSnapshot) {
  const items = new Map<
    string,
    {
      object: SchemaComparison["changes"][number]["object"];
      name: string;
      value: string;
    }
  >();
  for (const table of snapshot.tables) {
    items.set(table.id, {
      object: "table",
      name: `${table.adapter}:${table.namespace}.${table.name}`,
      value: JSON.stringify({
        name: table.name,
        namespace: table.namespace,
        adapter: table.adapter,
      }),
    });
    for (const column of table.columns)
      items.set(`${table.id}:column:${column.name}`, {
        object: "column",
        name: `${table.name}.${column.name}`,
        value: JSON.stringify({
          type: column.type,
          nullable: column.nullable,
          defaultValue: column.defaultValue,
          primaryKey: column.primaryKey,
          unique: column.unique,
        }),
      });
    for (const item of table.constraints)
      items.set(`${table.id}:constraint:${item.name}`, {
        object: "constraint",
        name: `${table.name}.${item.name}`,
        value: JSON.stringify({
          kind: item.kind,
          columns: item.columns,
          expression: item.expression,
        }),
      });
  }
  for (const item of snapshot.relations)
    items.set(`relation:${item.id}`, {
      object: "relation",
      name: item.name,
      value: JSON.stringify({
        source: item.sourceTableId,
        target: item.targetTableId,
        columns: item.columns,
        targetColumns: item.targetColumns,
        cardinality: item.cardinality,
        resolution: item.resolution,
        onDelete: item.onDelete,
      }),
    });
  for (const item of snapshot.enums)
    items.set(`enum:${item.adapter}:${item.name}`, {
      object: "enum",
      name: item.name,
      value: JSON.stringify(item.values),
    });
  return items;
}
export function compareSchemas(
  from: SchemaSnapshot,
  to: SchemaSnapshot,
  fromId = "before",
  toId = "after",
): SchemaComparison {
  const before = objects(from),
    after = objects(to);
  const changes: SchemaComparison["changes"] = [];
  for (const key of [...new Set([...before.keys(), ...after.keys()])].sort(
    (a, b) => a.localeCompare(b),
  )) {
    const old = before.get(key),
      next = after.get(key);
    if (old?.value === next?.value) continue;
    const item = next ?? old;
    if (!item) continue;
    let kind: SchemaComparison["changes"][number]["kind"] = "changed";
    if (!old) kind = "added";
    else if (!next) kind = "removed";
    changes.push({
      kind,
      object: item.object,
      name: item.name,
      before: old?.value ?? null,
      after: next?.value ?? null,
    });
  }
  return { from: fromId, to: toId, changes };
}
