import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "../types.js";
import { getLegendForDiagram } from "../legend.js";

export function renderSystemDiagram(
  input: AnalysisSnapshotInput,
): DiagramGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  if (input.frontend && input.frontend.components.length > 0) {
    nodes.push({
      id: "sys_frontend",
      label: "Frontend Web Application",
      kind: "frontend_tier",
      group: "Presentation Layer",
      status: "DIRECT",
      evidence: input.frontend.components[0]
        ? {
            path: input.frontend.components[0].filePath,
            startLine: input.frontend.components[0].startLine,
            endLine: input.frontend.components[0].endLine,
          }
        : undefined,
      properties: {
        componentCount: input.frontend.components.length,
        routeCount: input.frontend.routes.length,
      },
    });
  }

  if (input.backend && input.backend.routes.length > 0) {
    nodes.push({
      id: "sys_backend",
      label: "Backend API Service",
      kind: "backend_tier",
      group: "Application Layer",
      status: "DIRECT",
      evidence: input.backend.routes[0]
        ? {
            path: input.backend.routes[0].filePath,
            startLine: input.backend.routes[0].startLine,
            endLine: input.backend.routes[0].endLine,
          }
        : undefined,
      properties: {
        routeCount: input.backend.routes.length,
        controllerCount: input.backend.controllers.length,
        serviceCount: input.backend.services.length,
      },
    });
  }

  if (input.schema && input.schema.tables.length > 0) {
    nodes.push({
      id: "sys_database",
      label: "Relational Database Storage",
      kind: "database_tier",
      group: "Data Layer",
      status: "DIRECT",
      evidence: input.schema.tables[0]
        ? {
            path: input.schema.tables[0].filePath,
            startLine: input.schema.tables[0].startLine,
            endLine: input.schema.tables[0].endLine,
          }
        : undefined,
      properties: {
        tableCount: input.schema.tables.length,
      },
    });
  }

  if (input.infrastructure) {
    const totalInfra =
      input.infrastructure.containers.length +
      input.infrastructure.composeServices.length +
      input.infrastructure.workflows.length;
    if (totalInfra > 0) {
      nodes.push({
        id: "sys_infrastructure",
        label: "Deployment & CI/CD",
        kind: "infrastructure_tier",
        group: "Operations Layer",
        status: "DIRECT",
        properties: {
          containers: input.infrastructure.containers.length,
          composeServices: input.infrastructure.composeServices.length,
          workflows: input.infrastructure.workflows.length,
        },
      });
    }
  }

  const frontendNode = nodes.find((n) => n.id === "sys_frontend");
  const backendNode = nodes.find((n) => n.id === "sys_backend");
  const databaseNode = nodes.find((n) => n.id === "sys_database");
  const infraNode = nodes.find((n) => n.id === "sys_infrastructure");

  if (frontendNode && backendNode) {
    const hasResolvedClients =
      input.frontend?.apiClients?.some((c) => c.resolvedEndpointId) ?? false;
    edges.push({
      id: "edge_frontend_backend",
      source: "sys_frontend",
      target: "sys_backend",
      kind: "api_call",
      label: "HTTP / REST API",
      status: hasResolvedClients ? "RESOLVED" : "INFERRED",
      weight: Math.max(1, input.frontend?.apiClients?.length ?? 1),
      bidirectional: false,
    });
  }

  if (backendNode && databaseNode) {
    const hasRepositories = (input.backend?.repositories?.length ?? 0) > 0;
    edges.push({
      id: "edge_backend_database",
      source: "sys_backend",
      target: "sys_database",
      kind: "db_query",
      label: "Prisma / SQL Connection",
      status: hasRepositories ? "RESOLVED" : "INFERRED",
      weight: Math.max(1, input.backend?.repositories?.length ?? 1),
      bidirectional: false,
    });
  }

  if (infraNode && backendNode) {
    edges.push({
      id: "edge_infra_backend",
      source: "sys_infrastructure",
      target: "sys_backend",
      kind: "deploys",
      label: "Container Runtime",
      status: "RESOLVED",
      weight: 1,
      bidirectional: false,
    });
  }

  const uncertaintiesCount =
    nodes.filter((n) => n.status === "INFERRED" || n.status === "UNRESOLVED")
      .length +
    edges.filter((e) => e.status === "INFERRED" || e.status === "UNRESOLVED")
      .length;

  return {
    diagramType: "system",
    jobId: input.jobId,
    commitSha: input.commitSha,
    nodes,
    edges,
    legend: getLegendForDiagram("system"),
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      analyzerVersion: "1.0.0",
      uncertaintiesCount,
    },
  };
}
