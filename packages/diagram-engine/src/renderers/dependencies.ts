import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "../types.js";
import { getLegendForDiagram } from "../legend.js";

export function renderDependenciesDiagram(
  input: AnalysisSnapshotInput,
): DiagramGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const dependencies = input.dependencies;

  if (dependencies) {
    for (const item of dependencies.nodes) {
      nodes.push({
        id: item.id,
        label: item.name,
        kind: item.isExternal ? "external_package" : "module",
        group: item.isExternal ? "External Packages" : "Internal Modules",
        status: "DIRECT",
        evidence: item.evidence,
        properties: {
          path: item.path,
          isExternal: item.isExternal ?? false,
        },
      });
    }

    for (let index = 0; index < dependencies.edges.length; index++) {
      const edge = dependencies.edges[index];
      if (!edge) continue;
      edges.push({
        id: `dep_edge_${index}`,
        source: edge.sourceId,
        target: edge.targetId,
        kind: edge.kind,
        label: edge.kind,
        status: edge.status,
        evidence: edge.evidence,
        weight: edge.weight ?? 1,
        bidirectional: false,
      });
    }
  }

  const uncertaintiesCount =
    nodes.filter((n) => n.status === "INFERRED" || n.status === "UNRESOLVED")
      .length +
    edges.filter((e) => e.status === "INFERRED" || e.status === "UNRESOLVED")
      .length;

  return {
    diagramType: "dependencies",
    jobId: input.jobId,
    commitSha: input.commitSha,
    nodes,
    edges,
    legend: getLegendForDiagram("dependencies"),
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      analyzerVersion: "1.0.0",
      uncertaintiesCount,
    },
  };
}
