import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "../types.js";
import { getLegendForDiagram } from "../legend.js";

export function renderBackendDiagram(
  input: AnalysisSnapshotInput,
): DiagramGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const backend = input.backend;

  if (backend) {
    for (const route of backend.routes) {
      nodes.push({
        id: route.id,
        label: `${route.method} ${route.path}`,
        kind: "route",
        group: "HTTP Routes",
        status: "DIRECT",
        evidence: {
          path: route.filePath,
          startLine: route.startLine,
          endLine: route.endLine,
        },
        properties: {
          method: route.method,
          path: route.path,
        },
      });
    }

    for (const ctrl of backend.controllers) {
      nodes.push({
        id: ctrl.id,
        label: ctrl.name,
        kind: "controller",
        group: "Controllers",
        status: "DIRECT",
        evidence: {
          path: ctrl.filePath,
          startLine: ctrl.startLine,
          endLine: ctrl.endLine,
        },
        properties: {},
      });
    }

    for (const svc of backend.services) {
      nodes.push({
        id: svc.id,
        label: svc.name,
        kind: "service",
        group: "Services",
        status: "DIRECT",
        evidence: {
          path: svc.filePath,
          startLine: svc.startLine,
          endLine: svc.endLine,
        },
        properties: {},
      });
    }

    for (const repo of backend.repositories) {
      nodes.push({
        id: repo.id,
        label: repo.name,
        kind: "repository",
        group: "Repositories",
        status: "DIRECT",
        evidence: {
          path: repo.filePath,
          startLine: repo.startLine,
          endLine: repo.endLine,
        },
        properties: {
          modelName: repo.modelName,
        },
      });
    }

    for (const mw of backend.middleware) {
      nodes.push({
        id: mw.id,
        label: mw.name,
        kind: "middleware",
        group: "Middleware",
        status: "DIRECT",
        evidence: {
          path: mw.filePath,
          startLine: mw.startLine,
          endLine: mw.endLine,
        },
        properties: {},
      });
    }

    for (let index = 0; index < backend.connections.length; index++) {
      const conn = backend.connections[index];
      if (!conn) continue;
      edges.push({
        id: `be_edge_${index}`,
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
    diagramType: "backend",
    jobId: input.jobId,
    commitSha: input.commitSha,
    nodes,
    edges,
    legend: getLegendForDiagram("backend"),
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      analyzerVersion: "1.0.0",
      uncertaintiesCount,
    },
  };
}
