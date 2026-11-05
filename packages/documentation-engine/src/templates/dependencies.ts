import type { DocumentSection, SourceEvidence } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateDependenciesSections(input: AnalysisSnapshotInput): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const deps = input.dependencies;

  if (!deps || deps.nodes.length === 0) {
    sections.push({
      id: "deps_empty",
      title: "Dependency Graph Documentation",
      level: 1,
      content: "No module dependencies were extracted in this snapshot.",
      evidence: [],
    });
    return sections;
  }

  const allEvidence: SourceEvidence[] = [];

  const internalModules = deps.nodes.filter((n) => !n.isExternal);
  const externalPackages = deps.nodes.filter((n) => n.isExternal);

  sections.push({
    id: "deps_summary",
    title: "Dependency Summary",
    level: 1,
    content: [
      `- Internal Project Modules: **${internalModules.length}**`,
      `- External npm Packages: **${externalPackages.length}**`,
      `- Total Import Edges: **${deps.edges.length}**`,
      `- Detected Circular Dependency Cycles: **${deps.cycles?.length ?? 0}**`,
    ].join("\n"),
    evidence: [],
  });

  if (deps.cycles && deps.cycles.length > 0) {
    const cycleLines = deps.cycles.map((c, i) => `- Cycle ${i + 1}: \`${c.nodeIds.join(" -> ")}\``);
    sections.push({
      id: "deps_cycles",
      title: "Circular Dependencies",
      level: 2,
      content: cycleLines.join("\n"),
      evidence: [],
    });
  }

  const extLines = externalPackages.map((p) => `- \`${p.name}\``);
  sections.push({
    id: "deps_external",
    title: "External Package Inventory",
    level: 2,
    content: extLines.length > 0 ? extLines.join("\n") : "No external packages identified.",
    evidence: allEvidence,
  });

  return sections;
}
