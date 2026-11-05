import type { SnapshotSchemaInput } from "@codaryn/diagram-engine";

export function renderDbml(schema?: SnapshotSchemaInput): string {
  if (!schema || schema.tables.length === 0) {
    return "";
  }

  const lines: string[] = [];

  for (const table of schema.tables) {
    lines.push(`Table ${table.name} {`);
    for (const col of table.columns) {
      const pk = col.isPrimaryKey ? " [pk]" : "";
      const nullable = col.isNullable ? " [null]" : "";
      lines.push(`  ${col.name} ${col.dataType}${pk}${nullable}`);
    }
    lines.push("}", "");
  }

  for (const rel of schema.relations) {
    const op = rel.cardinality === "one_to_one" ? "-" : ">";
    lines.push(`Ref: ${rel.sourceTable}.${rel.sourceColumn} ${op} ${rel.targetTable}.${rel.targetColumn}`);
  }

  return lines.join("\n").trim() + "\n";
}
