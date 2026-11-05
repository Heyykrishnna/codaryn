import type { DocumentSection } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateSecuritySections(input: AnalysisSnapshotInput): DocumentSection[] {
  const sections: DocumentSection[] = [];

  sections.push({
    id: "sec_overview",
    title: "Security & Quality Assurance",
    level: 1,
    content: [
      `Commit under audit: \`${input.commitSha}\``,
      "",
      "Static code analysis inspects code for credentials, unsafe dynamic execution, and structural boundary compliance.",
    ].join("\n"),
    evidence: [],
  });

  sections.push({
    id: "sec_limitations",
    title: "Analysis Limitations & Scope",
    level: 2,
    content: [
      "- Heuristic relationships are tagged as `INFERRED` and must be confirmed by engineering review.",
      "- Static analysis cannot execute runtime dynamic imports or eval calls.",
      "- All confirmed architecture claims retain file path and line boundary evidence.",
    ].join("\n"),
    evidence: [],
  });

  return sections;
}
