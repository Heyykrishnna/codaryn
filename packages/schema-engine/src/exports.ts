import type {
  SchemaColumn,
  SchemaRelation,
  SchemaSnapshot,
} from "@codaryn/contracts";
const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const markdown = (value: string) =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\n", " ")
    .replaceAll("`", "\\`");
export function schemaPositions(
  snapshot: SchemaSnapshot,
  layout: "compact" | "er" = "er",
) {
  const tables = [...snapshot.tables].sort((a, b) =>
    `${a.domain}:${a.id}`.localeCompare(`${b.domain}:${b.id}`),
  );
  const columns = layout === "compact" ? 3 : 2;
  const rowHeight = layout === "compact" ? 180 : 380;
  return tables.map((table, index) => ({
    id: table.id,
    table,
    x: 30 + (index % columns) * 340,
    y: 50 + Math.floor(index / columns) * rowHeight,
    width: 300,
    height:
      layout === "compact"
        ? 120
        : Math.min(300, 55 + table.columns.length * 21),
  }));
}
type Position = ReturnType<typeof schemaPositions>[number];
function svgColumn(column: SchemaColumn, index: number, position: Position) {
  const label = `${column.primaryKey ? "PK " : ""}${column.name}: ${column.type}${column.nullable ? " ?" : ""}`;
  return `<text x="${position.x + 12}" y="${position.y + 49 + index * 21}" font-size="12" fill="#27272a">${escapeXml(label)}</text>`;
}
function svgTable(position: Position, layout: "compact" | "er") {
  const table = position.table;
  const columns = layout === "compact" ? [] : table.columns.slice(0, 11);
  const rendered = columns
    .map((column, index) => svgColumn(column, index, position))
    .join("");
  const label = escapeXml(table.name) + (table.joinTable ? " (join)" : "");
  return `<g><rect x="${position.x}" y="${position.y}" width="300" height="${position.height}" rx="8" fill="#fff" stroke="#3730a3"/><text x="${position.x + 12}" y="${position.y + 24}" fill="#18181b">${label}</text>${rendered}</g>`;
}
function svgRelation(relation: SchemaRelation, positions: Position[]) {
  const from = positions.find((item) => item.id === relation.sourceTableId),
    to = positions.find((item) => item.id === relation.targetTableId);
  if (!from || !to) return "";
  const x1 = from.x + from.width,
    y1 = from.y + 35,
    x2 = to.x,
    y2 = to.y + 35;
  const stroke = relation.resolution === "INFERRED" ? "#b45309" : "#4f46e5";
  const dash =
    relation.resolution === "INFERRED" ? 'stroke-dasharray="6 4"' : "";
  const label = escapeXml(
    `${relation.name} · ${relation.cardinality} · ${relation.resolution}`,
  );
  return `<g><path d="M${x1},${y1} C${x1 + 30},${y1 + 30} ${x2 - 30},${y2 + 30} ${x2},${y2}" fill="none" stroke="${stroke}" ${dash}/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 + 15}" font-size="10">${label}</text></g>`;
}
export function renderSchemaSvg(
  snapshot: SchemaSnapshot,
  snapshotId: string,
  hash: string,
  layout: "compact" | "er" = "er",
) {
  if (snapshot.tables.length > 100)
    throw new Error(
      "SVG export supports at most 100 tables; use JSON or a filtered view for larger snapshots",
    );
  const positions = schemaPositions(snapshot, layout);
  const width = layout === "compact" ? 1050 : 710;
  const height = Math.max(
    150,
    ...positions.map((item) => item.y + item.height + 40),
  );
  const labels = positions
    .map((position) => svgTable(position, layout))
    .join("");
  const relations = snapshot.relations
    .map((relation) => svgRelation(relation, positions))
    .join("");
  const title = escapeXml(`Schema ${snapshotId}`);
  const description = escapeXml(
    `Snapshot ${snapshotId}; SHA-256 ${hash}. Dashed amber relations are inferred. Columns may be truncated in the diagram; JSON and Markdown contain the complete model.`,
  );
  const label = escapeXml(`Snapshot ${snapshotId} · ${hash}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img"><title>${title}</title><desc>${description}</desc><rect width="100%" height="100%" fill="#fafafa"/><text x="30" y="25" font-size="12">${label}</text>${relations}${labels}</svg>`;
}
export function renderSchemaMarkdown(
  snapshot: SchemaSnapshot,
  snapshotId: string,
  hash: string,
) {
  const lines = [
    "# Schema documentation",
    `Snapshot: ${markdown(snapshotId)}`,
    `SHA-256: ${markdown(hash)}`,
    "",
    "This document references the same immutable snapshot as the ERD and JSON export.",
    "",
  ];
  for (const table of snapshot.tables) {
    lines.push(
      `## ${markdown(table.namespace)}.${markdown(table.name)}`,
      `Adapter: ${table.adapter}; source: ${markdown(table.evidence.path)}:${table.evidence.startLine}`,
      "",
      "| Column | Type | Nullable | Default | Keys |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const column of table.columns)
      lines.push(
        `| ${markdown(column.name)} | ${markdown(column.type)} | ${column.nullable} | ${markdown(column.defaultValue ?? "")} | ${column.primaryKey ? "PK " : ""}${column.unique ? "UNIQUE" : ""} |`,
      );
    lines.push(
      "",
      "### Constraints",
      ...table.constraints.map(
        (item) =>
          `- ${markdown(item.name)}: ${item.kind} (${item.columns.map(markdown).join(", ")})`,
      ),
      "",
    );
  }
  lines.push(
    "## Relationships",
    ...snapshot.relations.map(
      (item) =>
        `- ${markdown(item.name)}: ${item.cardinality}; ${item.resolution}; ${markdown(item.targetName)}`,
    ),
    "",
    "## Enums",
    ...snapshot.enums.map(
      (item) =>
        `- ${markdown(item.name)}: ${item.values.map(markdown).join(", ")}`,
    ),
    "",
    "## Diagnostics",
    ...snapshot.diagnostics.map(
      (item) =>
        `- ${item.code}: ${markdown(item.message)} (${markdown(item.evidence.path)}:${item.evidence.startLine})`,
    ),
  );
  return lines.join("\n");
}
