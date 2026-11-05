import type { DocumentSection, SourceEvidence } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateBackendSections(input: AnalysisSnapshotInput): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const backend = input.backend;

  if (!backend || backend.routes.length === 0) {
    sections.push({
      id: "backend_empty",
      title: "Backend Architecture",
      level: 1,
      content: "No backend routes or services were identified in this analysis snapshot.",
      evidence: [],
    });
    return sections;
  }

  const allEvidence: SourceEvidence[] = [];

  const routeLines = backend.routes.map((r) => {
    const ev: SourceEvidence = { path: r.filePath, startLine: r.startLine, endLine: r.endLine };
    allEvidence.push(ev);
    return `- **${r.method} \`${r.path}\`**: [${r.filePath}:${r.startLine}-${r.endLine}](file://${r.filePath}#L${r.startLine}-L${r.endLine})`;
  });

  sections.push({
    id: "backend_routes",
    title: "Server Routes",
    level: 1,
    content: routeLines.length > 0 ? routeLines.join("\n") : "No routes discovered.",
    evidence: allEvidence,
  });

  const svcLines = backend.services.map((s) => {
    const ev: SourceEvidence = { path: s.filePath, startLine: s.startLine, endLine: s.endLine };
    allEvidence.push(ev);
    return `- **${s.name}**: [${s.filePath}:${s.startLine}-${s.endLine}](file://${s.filePath}#L${s.startLine}-L${s.endLine})`;
  });

  sections.push({
    id: "backend_services",
    title: "Business Services",
    level: 2,
    content: svcLines.length > 0 ? svcLines.join("\n") : "No domain services discovered.",
    evidence: allEvidence,
  });

  const repoLines = backend.repositories.map((repo) => {
    const ev: SourceEvidence = { path: repo.filePath, startLine: repo.startLine, endLine: repo.endLine };
    allEvidence.push(ev);
    const model = repo.modelName ? ` (Model: \`${repo.modelName}\`)` : "";
    return `- **${repo.name}**${model}: [${repo.filePath}:${repo.startLine}-${repo.endLine}](file://${repo.filePath}#L${repo.startLine}-L${repo.endLine})`;
  });

  sections.push({
    id: "backend_repositories",
    title: "Repositories & Data Access",
    level: 2,
    content: repoLines.length > 0 ? repoLines.join("\n") : "No repositories discovered.",
    evidence: allEvidence,
  });

  return sections;
}
