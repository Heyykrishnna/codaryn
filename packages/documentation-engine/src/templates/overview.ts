import type { DocumentSection } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateOverviewSections(input: AnalysisSnapshotInput): DocumentSection[] {
  const sections: DocumentSection[] = [];

  sections.push({
    id: "summary",
    title: "Project Summary",
    level: 1,
    content: [
      `Repository: **${input.repositoryName}**`,
      `Analysis Snapshot: \`${input.jobId}\``,
      `Commit SHA: \`${input.commitSha}\``,
      "",
      "This document is deterministically generated from static code analysis facts.",
    ].join("\n"),
    evidence: [],
  });

  const feCount = input.frontend?.components.length ?? 0;
  const beCount = input.backend?.routes.length ?? 0;
  const tableCount = input.schema?.tables.length ?? 0;
  const depCount = input.dependencies?.nodes.length ?? 0;
  const fnCount = input.execution?.functions.length ?? 0;
  const infraCount =
    (input.infrastructure?.containers.length ?? 0) +
    (input.infrastructure?.composeServices.length ?? 0);

  sections.push({
    id: "architecture_inventory",
    title: "Architecture Inventory",
    level: 2,
    content: [
      "| Domain | Entity Count | Status |",
      "|---|---|---|",
      `| Frontend Components | ${feCount} | ${feCount > 0 ? "Extracted" : "None"} |`,
      `| Backend Routes | ${beCount} | ${beCount > 0 ? "Extracted" : "None"} |`,
      `| Database Tables | ${tableCount} | ${tableCount > 0 ? "Extracted" : "None"} |`,
      `| Module Dependencies | ${depCount} | ${depCount > 0 ? "Extracted" : "None"} |`,
      `| Executable Functions | ${fnCount} | ${fnCount > 0 ? "Extracted" : "None"} |`,
      `| Infrastructure Resources | ${infraCount} | ${infraCount > 0 ? "Extracted" : "None"} |`,
    ].join("\n"),
    evidence: [],
  });

  return sections;
}
