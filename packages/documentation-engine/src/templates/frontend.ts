import type { DocumentSection, SourceEvidence } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateFrontendSections(input: AnalysisSnapshotInput): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const frontend = input.frontend;

  if (!frontend || frontend.components.length === 0) {
    sections.push({
      id: "frontend_empty",
      title: "Frontend Architecture",
      level: 1,
      content: "No frontend components or routes were identified in this analysis snapshot.",
      evidence: [],
    });
    return sections;
  }

  const allEvidence: SourceEvidence[] = [];

  const pages = frontend.components.filter((c) => c.isPage);
  const pageLines = pages.map((p) => {
    const ev: SourceEvidence = { path: p.filePath, startLine: p.startLine, endLine: p.endLine };
    allEvidence.push(ev);
    return `- **${p.name}** (${p.routePath || "/"}): [${p.filePath}:${p.startLine}-${p.endLine}](file://${p.filePath}#L${p.startLine}-L${p.endLine})`;
  });

  sections.push({
    id: "frontend_pages",
    title: "Application Pages & Routing",
    level: 1,
    content: pageLines.length > 0 ? pageLines.join("\n") : "No dedicated page components discovered.",
    evidence: allEvidence,
  });

  const components = frontend.components.filter((c) => !c.isPage);
  const componentLines = components.map((c) => {
    const ev: SourceEvidence = { path: c.filePath, startLine: c.startLine, endLine: c.endLine };
    allEvidence.push(ev);
    return `- **${c.name}**: [${c.filePath}:${c.startLine}-${c.endLine}](file://${c.filePath}#L${c.startLine}-L${c.endLine})`;
  });

  sections.push({
    id: "frontend_components",
    title: "UI Components",
    level: 2,
    content: componentLines.length > 0 ? componentLines.join("\n") : "No standalone UI components discovered.",
    evidence: allEvidence,
  });

  const clientLines = frontend.apiClients.map((client) => {
    const ev: SourceEvidence = { path: client.filePath, startLine: client.startLine, endLine: client.endLine };
    allEvidence.push(ev);
    const res = client.resolvedEndpointId ? "RESOLVED" : "INFERRED";
    return `- **${client.method} ${client.endpoint}** [${res}]: [${client.filePath}:${client.startLine}-${client.endLine}](file://${client.filePath}#L${client.startLine}-L${client.endLine})`;
  });

  sections.push({
    id: "frontend_api_clients",
    title: "API Client Invocations",
    level: 2,
    content: clientLines.length > 0 ? clientLines.join("\n") : "No frontend API client calls discovered.",
    evidence: allEvidence,
  });

  return sections;
}
