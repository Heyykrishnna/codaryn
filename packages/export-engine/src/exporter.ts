import { createHash } from "node:crypto";
import type {
  DiagramLayoutConfig,
  DiagramType,
  DocumentTemplateId,
  ExportRequest,
} from "@codaryn/contracts";
import {
  renderDiagram,
  renderMermaid,
  type AnalysisSnapshotInput,
} from "@codaryn/diagram-engine";
import {
  generateAllDocuments,
  generateDocument,
} from "@codaryn/documentation-engine";
import type { ExportArtifactResult } from "./types.js";
import { renderSvg } from "./svg.js";
import { renderDbml } from "./dbml.js";
import { renderPrintableHtml } from "./html-report.js";
import { sanitizeExportContent } from "./sanitizer.js";

const contentTypes: Record<string, string> = {
  svg: "image/svg+xml; charset=utf-8",
  png: "image/svg+xml; charset=utf-8",
  pdf: "text/html; charset=utf-8",
  markdown: "text/markdown; charset=utf-8",
  mermaid: "text/vnd.mermaid; charset=utf-8",
  dbml: "text/vnd.dbml; charset=utf-8",
  json: "application/json; charset=utf-8",
};

const extensions: Record<string, string> = {
  svg: "svg",
  png: "svg",
  pdf: "html",
  markdown: "md",
  mermaid: "mmd",
  dbml: "dbml",
  json: "json",
};

export function exportArtifact(
  request: ExportRequest,
  snapshot: AnalysisSnapshotInput,
  layoutConfig?: DiagramLayoutConfig,
): ExportArtifactResult {
  const shortSha = snapshot.commitSha.slice(0, 7);
  const repoSlug = snapshot.repositoryName.replace(/[^a-zA-Z0-9_-]/g, "_");

  let rawContent = "";

  if (request.exportType === "diagram") {
    const diagramType = request.targetId as DiagramType;
    const graph = renderDiagram(diagramType, snapshot);

    switch (request.format) {
      case "svg":
      case "png":
        rawContent = renderSvg(graph, layoutConfig);
        break;
      case "mermaid":
        rawContent = renderMermaid(graph);
        break;
      case "dbml":
        rawContent = renderDbml(snapshot.schema);
        break;
      case "json":
        rawContent = JSON.stringify(graph, null, 2);
        break;
      case "pdf": {
        const svg = renderSvg(graph, layoutConfig);
        rawContent = renderPrintableHtml(
          `${diagramType} diagram`,
          `# ${diagramType.toUpperCase()} Architecture Diagram\n\nGenerated for commit \`${shortSha}\``,
          svg,
        );
        break;
      }
      default:
        rawContent = JSON.stringify(graph, null, 2);
    }
  } else if (request.exportType === "document") {
    const templateId = request.targetId as DocumentTemplateId;
    const document = generateDocument(templateId, snapshot);

    switch (request.format) {
      case "markdown":
        rawContent = document.markdown;
        break;
      case "json":
        rawContent = JSON.stringify(document, null, 2);
        break;
      case "pdf":
        rawContent = renderPrintableHtml(document.title, document.markdown);
        break;
      case "mermaid": {
        const previews = document.sections
          .map((s) => s.diagramPreview)
          .filter(Boolean);
        rawContent = previews.join("\n\n---\n\n");
        break;
      }
      default:
        rawContent = document.markdown;
    }
  } else {
    const allDocs = generateAllDocuments(snapshot);
    if (request.format === "json") {
      rawContent = JSON.stringify(allDocs, null, 2);
    } else {
      rawContent = allDocs.map((d) => d.markdown).join("\n\n---\n\n");
    }
  }

  const content = sanitizeExportContent(rawContent);
  const ext = extensions[request.format] || "txt";
  const filename = `${repoSlug}_${request.targetId}_${shortSha}.${ext}`;
  const contentType = contentTypes[request.format] || "text/plain; charset=utf-8";
  const size = Buffer.byteLength(content, "utf8");
  const hash = createHash("sha256").update(content, "utf8").digest("hex");

  return {
    filename,
    contentType,
    content,
    size,
    hash,
    format: request.format,
    exportType: request.exportType,
  };
}
