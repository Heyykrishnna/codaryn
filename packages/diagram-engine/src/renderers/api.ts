import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "../types.js";
import { getLegendForDiagram } from "../legend.js";

export function renderApiDiagram(input: AnalysisSnapshotInput): DiagramGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  const routes = input.backend?.routes ?? [];
  const clients = input.frontend?.apiClients ?? [];
  const controllers = input.backend?.controllers ?? [];

  for (const route of routes) {
    nodes.push({
      id: route.id,
      label: `${route.method} ${route.path}`,
      kind: "endpoint",
      group: "API Endpoints",
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

    if (route.controllerId) {
      const ctrl = controllers.find((c) => c.id === route.controllerId);
      if (ctrl) {
        if (!nodes.some((n) => n.id === ctrl.id)) {
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
        edges.push({
          id: `api_edge_${route.id}_${ctrl.id}`,
          source: route.id,
          target: ctrl.id,
          kind: "handled_by",
          label: "Handled By",
          status: "RESOLVED",
          weight: 1,
          bidirectional: false,
        });
      }
    }
  }

  for (const client of clients) {
    nodes.push({
      id: client.id,
      label: `Client: ${client.endpoint}`,
      kind: "client",
      group: "Frontend Call Sites",
      status: client.resolvedEndpointId ? "RESOLVED" : "INFERRED",
      evidence: {
        path: client.filePath,
        startLine: client.startLine,
        endLine: client.endLine,
      },
      properties: {
        method: client.method,
        endpoint: client.endpoint,
      },
    });

    if (
      client.resolvedEndpointId &&
      nodes.some((n) => n.id === client.resolvedEndpointId)
    ) {
      edges.push({
        id: `client_edge_${client.id}_${client.resolvedEndpointId}`,
        source: client.id,
        target: client.resolvedEndpointId,
        kind: "calls",
        label: `${client.method} Request`,
        status: "RESOLVED",
        evidence: {
          path: client.filePath,
          startLine: client.startLine,
          endLine: client.endLine,
        },
        weight: 1,
        bidirectional: false,
      });
    } else {
      const match = routes.find(
        (r) =>
          r.method.toUpperCase() === client.method.toUpperCase() &&
          r.path.includes(client.endpoint.replace(/^\/api\/v\d+\//, "/")),
      );
      if (match) {
        edges.push({
          id: `client_inferred_${client.id}_${match.id}`,
          source: client.id,
          target: match.id,
          kind: "calls",
          label: "Inferred Call",
          status: "INFERRED",
          weight: 1,
          bidirectional: false,
        });
      }
    }
  }

  const uncertaintiesCount =
    nodes.filter((n) => n.status === "INFERRED" || n.status === "UNRESOLVED")
      .length +
    edges.filter((e) => e.status === "INFERRED" || e.status === "UNRESOLVED")
      .length;

  return {
    diagramType: "api",
    jobId: input.jobId,
    commitSha: input.commitSha,
    nodes,
    edges,
    legend: getLegendForDiagram("api"),
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      analyzerVersion: "1.0.0",
      uncertaintiesCount,
    },
  };
}
