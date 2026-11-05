import { randomUUID } from "node:crypto";
import type {
  DocumentSection,
  DocumentTemplateId,
  GeneratedDocument,
} from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";
import { generateOverviewSections } from "./templates/overview.js";
import { generateArchitectureSections } from "./templates/architecture.js";
import { generateFrontendSections } from "./templates/frontend.js";
import { generateBackendSections } from "./templates/backend.js";
import { generateApiSections } from "./templates/api.js";
import { generateSchemaSections } from "./templates/schema.js";
import { generateDependenciesSections } from "./templates/dependencies.js";
import { generateExecutionSections } from "./templates/execution.js";
import { generateInfrastructureSections } from "./templates/infrastructure.js";
import { generateSecuritySections } from "./templates/security.js";

const templateTitles: Record<DocumentTemplateId, string> = {
  overview: "Project Overview",
  architecture: "System Architecture",
  frontend: "Frontend Architecture",
  backend: "Backend Architecture",
  api: "API Reference",
  schema: "Database Schema Reference",
  dependencies: "Dependency Graph Documentation",
  execution: "Execution & Call Graph Documentation",
  infrastructure: "Infrastructure & CI/CD Documentation",
  security: "Security & Limitations",
};

const templateGenerators: Record<
  DocumentTemplateId,
  (input: AnalysisSnapshotInput) => DocumentSection[]
> = {
  overview: generateOverviewSections,
  architecture: generateArchitectureSections,
  frontend: generateFrontendSections,
  backend: generateBackendSections,
  api: generateApiSections,
  schema: generateSchemaSections,
  dependencies: generateDependenciesSections,
  execution: generateExecutionSections,
  infrastructure: generateInfrastructureSections,
  security: generateSecuritySections,
};

export function assembleMarkdown(
  title: string,
  sections: DocumentSection[],
  input: AnalysisSnapshotInput,
): string {
  const parts: string[] = [
    `# ${title}`,
    "",
    `> **Repository:** ${input.repositoryName} | **Commit:** \`${input.commitSha}\` | **Snapshot:** \`${input.jobId}\` | **Analyzer:** v1.0.0`,
    "",
  ];

  for (const section of sections) {
    const headingPrefix = "#".repeat(Math.min(6, section.level + 1));
    parts.push(`${headingPrefix} ${section.title}`, "");
    if (section.diagramPreview) {
      parts.push("```mermaid", section.diagramPreview, "```", "");
    }
    parts.push(section.content, "");
  }

  return parts.join("\n");
}

export function generateDocument(
  templateId: DocumentTemplateId,
  input: AnalysisSnapshotInput,
): GeneratedDocument {
  const generator = templateGenerators[templateId];
  const sections = generator(input);
  const title = templateTitles[templateId];
  const markdown = assembleMarkdown(title, sections, input);

  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  const evidenceCount = sections.reduce(
    (acc, curr) => acc + (curr.evidence ? curr.evidence.length : 0),
    0,
  );
  const uncertaintyCount = (markdown.match(/INFERRED|UNRESOLVED/g) || [])
    .length;

  return {
    id: randomUUID(),
    templateId,
    title,
    version: 1,
    jobId: input.jobId,
    commitSha: input.commitSha,
    sections,
    markdown,
    metadata: {
      generatedAt: new Date().toISOString(),
      analyzerVersion: "1.0.0",
      commitSha: input.commitSha,
      repositoryName: input.repositoryName,
      wordCount: words,
      evidenceCount,
      uncertaintyCount,
    },
  };
}

export function generateAllDocuments(
  input: AnalysisSnapshotInput,
): GeneratedDocument[] {
  const templates: DocumentTemplateId[] = [
    "overview",
    "architecture",
    "frontend",
    "backend",
    "api",
    "schema",
    "dependencies",
    "execution",
    "infrastructure",
    "security",
  ];
  return templates.map((templateId) => generateDocument(templateId, input));
}
