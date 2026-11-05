import type { ExportFormat, ExportType } from "@codaryn/contracts";

export interface ExportArtifactResult {
  filename: string;
  contentType: string;
  content: string;
  size: number;
  hash: string;
  format: ExportFormat;
  exportType: ExportType;
}
