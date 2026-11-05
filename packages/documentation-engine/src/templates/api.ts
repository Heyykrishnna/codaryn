import type { DocumentSection, SourceEvidence } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateApiSections(
  input: AnalysisSnapshotInput,
): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const routes = input.backend?.routes ?? [];
  const clients = input.frontend?.apiClients ?? [];

  if (routes.length === 0) {
    sections.push({
      id: "api_empty",
      title: "API Reference",
      level: 1,
      content: "No API routes discovered in this snapshot.",
      evidence: [],
    });
    return sections;
  }

  const allEvidence: SourceEvidence[] = [];

  const tableHeader = [
    "| Method | Endpoint Path | Source File | Clients Calling |",
    "|---|---|---|---|",
  ];

  const tableRows = routes.map((r) => {
    const ev: SourceEvidence = {
      path: r.filePath,
      startLine: r.startLine,
      endLine: r.endLine,
    };
    allEvidence.push(ev);
    const matchedClients = clients.filter(
      (c) =>
        c.resolvedEndpointId === r.id ||
        (c.method.toUpperCase() === r.method.toUpperCase() &&
          r.path.includes(c.endpoint.replace(/^\/api\/v\d+\//, "/"))),
    );
    const clientCount = matchedClients.length;
    return `| \`${r.method}\` | \`${r.path}\` | [${r.filePath}:${r.startLine}](file://${r.filePath}#L${r.startLine}-L${r.endLine}) | ${clientCount} |`;
  });

  sections.push({
    id: "api_catalog",
    title: "Endpoint Catalog",
    level: 1,
    content: [...tableHeader, ...tableRows].join("\n"),
    evidence: allEvidence,
  });

  return sections;
}
