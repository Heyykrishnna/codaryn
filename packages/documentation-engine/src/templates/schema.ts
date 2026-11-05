import type { DocumentSection, SourceEvidence } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateSchemaSections(
  input: AnalysisSnapshotInput,
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const schema = input.schema;

  if (!schema || schema.tables.length === 0) {
    sections.push({
      id: "schema_empty",
      title: "Database Schema Reference",
      level: 1,
      content:
        "No database schema models or tables were identified in this snapshot.",
      evidence: [],
    });
    return sections;
  }

  const allEvidence: SourceEvidence[] = [];

  for (const table of schema.tables) {
    const ev: SourceEvidence = {
      path: table.filePath,
      startLine: table.startLine,
      endLine: table.endLine,
    };
    allEvidence.push(ev);

    const lines = [
      `Declared in: [${table.filePath}:${table.startLine}-${table.endLine}](file://${table.filePath}#L${table.startLine}-L${table.endLine})`,
      "",
      "| Column Name | Data Type | Primary Key | Nullable |",
      "|---|---|---|---|",
    ];

    for (const col of table.columns) {
      lines.push(
        `| \`${col.name}\` | \`${col.dataType}\` | ${col.isPrimaryKey ? "Yes" : "No"} | ${col.isNullable ? "Yes" : "No"} |`,
      );
    }

    sections.push({
      id: `schema_table_${table.name}`,
      title: `Table: ${table.name}`,
      level: 2,
      content: lines.join("\n"),
      evidence: [ev],
    });
  }

  if (schema.relations.length > 0) {
    const relLines = [
      "| Source Table | Source Column | Target Table | Target Column | Cardinality | Status |",
      "|---|---|---|---|---|---|",
    ];

    for (const rel of schema.relations) {
      if (rel.evidence) allEvidence.push(rel.evidence);
      relLines.push(
        `| \`${rel.sourceTable}\` | \`${rel.sourceColumn}\` | \`${rel.targetTable}\` | \`${rel.targetColumn}\` | ${rel.cardinality} | \`${rel.status}\` |`,
      );
    }

    sections.push({
      id: "schema_relations",
      title: "Foreign Key Relationships",
      level: 2,
      content: relLines.join("\n"),
      evidence: schema.relations.flatMap((r) =>
        r.evidence ? [r.evidence] : [],
      ),
    });
  }

  return sections;
}
