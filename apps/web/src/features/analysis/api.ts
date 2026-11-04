import { workspaceRequest } from "@/src/lib/workspace-request";
import type {
  AnalysisJobSummary,
  DiagnosticsResponse,
  FileInventoryResponse,
  SymbolInventoryResponse,
} from "@codaryn/contracts";

export function analysisRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
  mutation = false,
): Promise<unknown> {
  return workspaceRequest(
    "analysis",
    action,
    workspaceId,
    input,
    mutation,
    "The request failed. Reload and try again.",
  );
}

export async function fetchAnalysisJob(
  workspaceId: string,
  jobId: string,
): Promise<AnalysisJobSummary> {
  const res = await analysisRequest("job", workspaceId, { jobId }, false);
  return res as AnalysisJobSummary;
}

export async function fetchFileInventory(
  workspaceId: string,
  jobId: string,
): Promise<FileInventoryResponse> {
  const res = await analysisRequest("inventory", workspaceId, { jobId }, false);
  return res as FileInventoryResponse;
}

export async function fetchSymbols(
  workspaceId: string,
  jobId: string,
  kind?: string,
): Promise<SymbolInventoryResponse> {
  const res = await analysisRequest(
    "symbols",
    workspaceId,
    { jobId, kind },
    false,
  );
  return res as SymbolInventoryResponse;
}

export async function fetchDiagnostics(
  workspaceId: string,
  jobId: string,
): Promise<DiagnosticsResponse> {
  const res = await analysisRequest(
    "diagnostics",
    workspaceId,
    { jobId },
    false,
  );
  return res as DiagnosticsResponse;
}

export async function cancelAnalysisJob(
  workspaceId: string,
  jobId: string,
): Promise<AnalysisJobSummary> {
  const res = await analysisRequest("cancel", workspaceId, { jobId }, true);
  return res as AnalysisJobSummary;
}

export async function retryAnalysisJob(
  workspaceId: string,
  jobId: string,
): Promise<AnalysisJobSummary> {
  const res = await analysisRequest("retry", workspaceId, { jobId }, true);
  return res as AnalysisJobSummary;
}
