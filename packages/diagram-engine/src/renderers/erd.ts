import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "../types.js";
import { getLegendForDiagram } from "../legend.js";

export function renderErdDiagram(input: AnalysisSnapshotInput): DiagramGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const schema = input.schema;

  if (schema) {
    for (const tbl of schema.tables) {
      nodes.push({
        id: `tbl_${tbl.name}`,
        label: tbl.name,
        kind: "table",
        group: "Database Tables",
        status: "DIRECT",
        evidence: {
          path: tbl.filePath,
          startLine: tbl.startLine,
          endLine: tbl.endLine,
        },
        properties: {
          columns: tbl.columns,
          columnCount: tbl.columns.length,
        },
      });
    }

    for (const rel of schema.relations) {
      const srcId = `tbl_${rel.sourceTable}`;
      const tgtId = `tbl_${rel.targetTable}`;
      edges.push({
        id: `erd_rel_${rel.id}`,
        source: srcId,
        target: tgtId,
        kind: "foreign_key",
        label: `${rel.sourceColumn} -> ${rel.targetColumn} (${rel.cardinality})`,
        status: rel.status,
        evidence: rel.evidence,
        weight: 1,
        bidirectional: rel.cardinality === "many_to_many",
      });
    }
  }

  const uncertaintiesCount =
    nodes.filter((n) => n.status === "INFERRED" || n.status === "UNRESOLVED")
      .length +
    edges.filter((e) => e.status === "INFERRED" || e.status === "UNRESOLVED")
      .length;

  return {
    diagramType: "erd",
    jobId: input.jobId,
    commitSha: input.commitSha,
    nodes,
    edges,
    legend: getLegendForDiagram("erd"),
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      analyzerVersion: "1.0.0",
      uncertaintiesCount,
    },
  };
}
