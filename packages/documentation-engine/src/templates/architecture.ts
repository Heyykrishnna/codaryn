import type { DocumentSection } from "@codaryn/contracts";
import { renderDiagram, renderMermaid, type AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateArchitectureSections(input: AnalysisSnapshotInput): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const systemDiagram = renderDiagram("system", input);
  const mermaidDiagram = renderMermaid(systemDiagram);

  sections.push({
    id: "system_architecture",
    title: "System Architecture",
    level: 1,
    content: "The following diagram illustrates the high-level application tiers, communication boundaries, and persistence mapping.",
    diagramPreview: mermaidDiagram,
    evidence: [],
  });

  const tierContent: string[] = [];
  for (const node of systemDiagram.nodes) {
    const ev = node.evidence
      ? ` ([${node.evidence.path}:${node.evidence.startLine}-${node.evidence.endLine}](file://${node.evidence.path}#L${node.evidence.startLine}-L${node.evidence.endLine}))`
      : "";
    tierContent.push(`- **${node.label}** (${node.group || node.kind}): Status \`${node.status}\`${ev}`);
  }

  sections.push({
    id: "system_tiers",
    title: "Application Tiers & Boundaries",
    level: 2,
    content: tierContent.length > 0 ? tierContent.join("\n") : "No application tiers were detected in this snapshot.",
    evidence: systemDiagram.nodes.flatMap((n) => (n.evidence ? [n.evidence] : [])),
  });

  const edgeContent: string[] = [];
  for (const edge of systemDiagram.edges) {
    const ev = edge.evidence
      ? ` ([${edge.evidence.path}:${edge.evidence.startLine}-${edge.evidence.endLine}](file://${edge.evidence.path}#L${edge.evidence.startLine}-L${edge.evidence.endLine}))`
      : "";
    edgeContent.push(`- **${edge.source}** -> **${edge.target}**: \`${edge.label || edge.kind}\` [${edge.status}]${ev}`);
  }

  sections.push({
    id: "tier_connectivity",
    title: "Cross-Tier Communication",
    level: 2,
    content: edgeContent.length > 0 ? edgeContent.join("\n") : "No cross-tier connections detected.",
    evidence: systemDiagram.edges.flatMap((e) => (e.evidence ? [e.evidence] : [])),
  });

  return sections;
}
