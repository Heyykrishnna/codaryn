import type { DiagramGraph, DiagramType } from "@codaryn/contracts";
import type { AnalysisSnapshotInput } from "./types.js";
import { renderSystemDiagram } from "./renderers/system.js";
import { renderFrontendDiagram } from "./renderers/frontend.js";
import { renderBackendDiagram } from "./renderers/backend.js";
import { renderApiDiagram } from "./renderers/api.js";
import { renderErdDiagram } from "./renderers/erd.js";
import { renderDependenciesDiagram } from "./renderers/dependencies.js";
import { renderExecutionDiagram } from "./renderers/execution.js";
import { renderInfrastructureDiagram } from "./renderers/infrastructure.js";

export * from "./types.js";
export * from "./legend.js";
export * from "./mermaid.js";
export * from "./renderers/system.js";
export * from "./renderers/frontend.js";
export * from "./renderers/backend.js";
export * from "./renderers/api.js";
export * from "./renderers/erd.js";
export * from "./renderers/dependencies.js";
export * from "./renderers/execution.js";
export * from "./renderers/infrastructure.js";

export function renderDiagram(
  type: DiagramType,
  input: AnalysisSnapshotInput,
): DiagramGraph {
  switch (type) {
    case "system":
      return renderSystemDiagram(input);
    case "frontend":
      return renderFrontendDiagram(input);
    case "backend":
      return renderBackendDiagram(input);
    case "api":
      return renderApiDiagram(input);
    case "erd":
      return renderErdDiagram(input);
    case "dependencies":
      return renderDependenciesDiagram(input);
    case "execution":
      return renderExecutionDiagram(input);
    case "infrastructure":
      return renderInfrastructureDiagram(input);
  }
}
