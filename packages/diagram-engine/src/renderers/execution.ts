import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "../types.js";
import { getLegendForDiagram } from "../legend.js";

export function renderExecutionDiagram(input: AnalysisSnapshotInput): DiagramGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const execution = input.execution;

  if (execution) {
    for (const fn of execution.functions) {
      nodes.push({
        id: fn.id,
        label: fn.name,
        kind: "function",
        group: fn.isExported ? "Public API / Exports" : "Internal Functions",
        status: "DIRECT",
        evidence: {
          path: fn.filePath,
          startLine: fn.startLine,
          endLine: fn.endLine,
        },
        properties: {
          isExported: fn.isExported ?? false,
        },
      });
    }

    for (let index = 0; index < execution.calls.length; index++) {
      const call = execution.calls[index];
      if (!call) continue;
      edges.push({
        id: `exec_edge_${index}`,
        source: call.callerId,
        target: call.calleeId,
        kind: "calls",
        label: "Invokes",
        status: call.status,
        evidence: call.evidence,
        weight: 1,
        bidirectional: false,
      });
    }
  }

  const uncertaintiesCount =
    nodes.filter((n) => n.status === "INFERRED" || n.status === "UNRESOLVED").length +
    edges.filter((e) => e.status === "INFERRED" || e.status === "UNRESOLVED").length;

  return {
    diagramType: "execution",
    jobId: input.jobId,
    commitSha: input.commitSha,
    nodes,
    edges,
    legend: getLegendForDiagram("execution"),
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      analyzerVersion: "1.0.0",
      uncertaintiesCount,
    },
  };
}
