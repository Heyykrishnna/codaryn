import type { DocumentSection, SourceEvidence } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";

export function generateExecutionSections(input: AnalysisSnapshotInput): DocumentSection[] {
  const sections: DocumentSection[] = [];
  const exec = input.execution;

  if (!exec || exec.functions.length === 0) {
    sections.push({
      id: "exec_empty",
      title: "Execution & Call Graph Documentation",
      level: 1,
      content: "No function call graphs were extracted in this snapshot.",
      evidence: [],
    });
    return sections;
  }

  const allEvidence: SourceEvidence[] = [];

  const publicFns = exec.functions.filter((f) => f.isExported);
  const internalFns = exec.functions.filter((f) => !f.isExported);

  sections.push({
    id: "exec_summary",
    title: "Call Graph Summary",
    level: 1,
    content: [
      `- Exported Entrypoint Functions: **${publicFns.length}**`,
      `- Internal Implementation Functions: **${internalFns.length}**`,
      `- Statically Resolved Invocations: **${exec.calls.length}**`,
    ].join("\n"),
    evidence: [],
  });

  const fnLines = exec.functions.map((f) => {
    const ev: SourceEvidence = { path: f.filePath, startLine: f.startLine, endLine: f.endLine };
    allEvidence.push(ev);
    const exp = f.isExported ? " [Exported]" : "";
    return `- **\`${f.name}\`**${exp}: [${f.filePath}:${f.startLine}-${f.endLine}](file://${f.filePath}#L${f.startLine}-L${f.endLine})`;
  });

  sections.push({
    id: "exec_functions",
    title: "Function Inventory",
    level: 2,
    content: fnLines.join("\n"),
    evidence: allEvidence,
  });

  return sections;
}
