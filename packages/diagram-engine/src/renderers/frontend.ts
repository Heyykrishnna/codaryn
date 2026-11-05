import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "../types.js";
import { getLegendForDiagram } from "../legend.js";

export function renderFrontendDiagram(
  input: AnalysisSnapshotInput,
): DiagramGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const frontend = input.frontend;

  if (frontend) {
    for (const comp of frontend.components) {
      nodes.push({
        id: comp.id,
        label: comp.name,
        kind: comp.isPage ? "page" : "component",
        group: comp.isPage ? "Pages" : "Components",
        status: "DIRECT",
        evidence: {
          path: comp.filePath,
          startLine: comp.startLine,
          endLine: comp.endLine,
        },
        properties: {
          isPage: comp.isPage ?? false,
          routePath: comp.routePath,
        },
      });
    }

    for (const ctx of frontend.contexts) {
      nodes.push({
        id: ctx.id,
        label: ctx.name,
        kind: "context",
        group: "State & Contexts",
        status: "DIRECT",
        evidence: {
          path: ctx.filePath,
          startLine: ctx.startLine,
          endLine: ctx.endLine,
        },
        properties: {},
      });
    }

    for (const client of frontend.apiClients) {
      nodes.push({
        id: client.id,
        label: `${client.method} ${client.endpoint}`,
        kind: "api_client",
        group: "Network Calls",
        status: client.resolvedEndpointId ? "RESOLVED" : "INFERRED",
        evidence: {
          path: client.filePath,
          startLine: client.startLine,
          endLine: client.endLine,
        },
        properties: {
          method: client.method,
          endpoint: client.endpoint,
          resolvedEndpointId: client.resolvedEndpointId,
        },
      });
    }

    for (let index = 0; index < frontend.connections.length; index++) {
      const conn = frontend.connections[index];
      if (!conn) continue;
      edges.push({
        id: `fe_edge_${index}`,
        source: conn.sourceId,
        target: conn.targetId,
        kind: conn.kind,
        label: conn.kind,
        status: conn.status,
        evidence: conn.evidence,
        weight: 1,
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
    diagramType: "frontend",
    jobId: input.jobId,
    commitSha: input.commitSha,
    nodes,
    edges,
    legend: getLegendForDiagram("frontend"),
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      analyzerVersion: "1.0.0",
      uncertaintiesCount,
    },
  };
}
