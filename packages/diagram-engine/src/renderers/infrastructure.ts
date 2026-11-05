import type {
  DiagramEdge,
  DiagramGraph,
  DiagramNode,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "../types.js";
import { getLegendForDiagram } from "../legend.js";

export function renderInfrastructureDiagram(
  input: AnalysisSnapshotInput,
): DiagramGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const infra = input.infrastructure;

  if (infra) {
    for (const container of infra.containers) {
      nodes.push({
        id: `cnt_${container.name}`,
        label: `${container.name} (${container.baseImage})`,
        kind: "container",
        group: "Container Images",
        status: "DIRECT",
        evidence: {
          path: container.filePath,
          startLine: container.startLine,
          endLine: container.endLine,
        },
        properties: {
          baseImage: container.baseImage,
        },
      });
    }

    for (const service of infra.composeServices) {
      const sId = `svc_${service.name}`;
      nodes.push({
        id: sId,
        label: service.name,
        kind: "compose_service",
        group: "Compose Services",
        status: "DIRECT",
        evidence: {
          path: service.filePath,
          startLine: service.startLine,
          endLine: service.endLine,
        },
        properties: {
          image: service.image,
          ports: service.ports,
        },
      });

      if (service.dependsOn) {
        for (const dep of service.dependsOn) {
          edges.push({
            id: `compose_dep_${service.name}_${dep}`,
            source: sId,
            target: `svc_${dep}`,
            kind: "depends_on",
            label: "Depends On",
            status: "DIRECT",
            weight: 1,
            bidirectional: false,
          });
        }
      }
    }

    for (const wf of infra.workflows) {
      nodes.push({
        id: `wf_${wf.name}`,
        label: `CI: ${wf.name}`,
        kind: "workflow",
        group: "CI/CD Workflows",
        status: "DIRECT",
        evidence: {
          path: wf.filePath,
          startLine: wf.startLine,
          endLine: wf.endLine,
        },
        properties: {
          triggers: wf.triggers,
          jobs: wf.jobs,
        },
      });
    }
  }

  const uncertaintiesCount =
    nodes.filter((n) => n.status === "INFERRED" || n.status === "UNRESOLVED")
      .length +
    edges.filter((e) => e.status === "INFERRED" || e.status === "UNRESOLVED")
      .length;

  return {
    diagramType: "infrastructure",
    jobId: input.jobId,
    commitSha: input.commitSha,
    nodes,
    edges,
    legend: getLegendForDiagram("infrastructure"),
    metadata: {
      generatedAt: new Date().toISOString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      analyzerVersion: "1.0.0",
      uncertaintiesCount,
    },
  };
}
