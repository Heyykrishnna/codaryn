import type { DocumentSection, SourceEvidence } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateInfrastructureSections(
  input: AnalysisSnapshotInput,
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const infra = input.infrastructure;

  if (!infra) {
    sections.push({
      id: "infra_empty",
      title: "Infrastructure & CI/CD Documentation",
      level: 1,
      content: "No infrastructure definitions detected in this snapshot.",
      evidence: [],
    });
    return sections;
  }

  const allEvidence: SourceEvidence[] = [];

  const containerLines = infra.containers.map((c) => {
    const ev: SourceEvidence = {
      path: c.filePath,
      startLine: c.startLine,
      endLine: c.endLine,
    };
    allEvidence.push(ev);
    return `- **${c.name}** (Base image: \`${c.baseImage}\`): [${c.filePath}:${c.startLine}-${c.endLine}](file://${c.filePath}#L${c.startLine}-L${c.endLine})`;
  });

  sections.push({
    id: "infra_containers",
    title: "Container Definitions",
    level: 1,
    content:
      containerLines.length > 0
        ? containerLines.join("\n")
        : "No Dockerfiles detected.",
    evidence: allEvidence,
  });

  const composeLines = infra.composeServices.map((s) => {
    const ev: SourceEvidence = {
      path: s.filePath,
      startLine: s.startLine,
      endLine: s.endLine,
    };
    allEvidence.push(ev);
    const ports = s.ports ? ` (Ports: ${s.ports.join(", ")})` : "";
    const deps = s.dependsOn ? ` (Depends on: ${s.dependsOn.join(", ")})` : "";
    return `- **${s.name}**${ports}${deps}: [${s.filePath}:${s.startLine}-${s.endLine}](file://${s.filePath}#L${s.startLine}-L${s.endLine})`;
  });

  sections.push({
    id: "infra_compose",
    title: "Compose Services",
    level: 2,
    content:
      composeLines.length > 0
        ? composeLines.join("\n")
        : "No Compose services detected.",
    evidence: allEvidence,
  });

  const wfLines = infra.workflows.map((w) => {
    const ev: SourceEvidence = {
      path: w.filePath,
      startLine: w.startLine,
      endLine: w.endLine,
    };
    allEvidence.push(ev);
    return `- **${w.name}** (Triggers: \`${w.triggers.join(", ")}\`; Jobs: \`${w.jobs.join(", ")}\`): [${w.filePath}:${w.startLine}-${w.endLine}](file://${w.filePath}#L${w.startLine}-L${w.endLine})`;
  });

  sections.push({
    id: "infra_workflows",
    title: "CI/CD Workflows",
    level: 2,
    content:
      wfLines.length > 0
        ? wfLines.join("\n")
        : "No GitHub Actions workflows detected.",
    evidence: allEvidence,
  });

  return sections;
}
