import { z } from "zod";
import type {
  AnalysisJobSummary,
  DiagnosticsResponse,
  FileInventoryResponse,
  SymbolInventoryResponse,
} from "@codaryn/contracts";

export async function analysisRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
  mutation = false,
): Promise<unknown> {
  const query = new URLSearchParams({ workspaceId });
  for (const [key, value] of Object.entries(input)) {
    if (!mutation && value !== undefined) query.set(key, String(value));
  }

  const response = await fetch(`/api/v1/analysis/${action}?${query}`, {
    method: mutation ? "POST" : "GET",
    headers: mutation
      ? {
          "content-type": "application/json",
          "x-codaryn-request": "workspace",
        }
      : {},
    ...(mutation ? { body: JSON.stringify({ workspaceId, ...input }) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const error = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(await response.json().catch(() => null));
    throw new Error(
      error.success
        ? error.data.error.message
        : "The request failed. Reload and try again.",
    );
  }

  return response.json();
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
