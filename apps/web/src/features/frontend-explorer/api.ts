import { z } from "zod";
import type {
  FrontendOverviewResponse,
  FrontendComponentsResponse,
  FrontendComponentDetailResponse,
  FrontendRoutesResponse,
  FrontendHooksResponse,
  FrontendContextsResponse,
  FrontendStateResponse,
  FrontendApiClientsResponse,
} from "@codaryn/contracts";

export async function frontendRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  const query = new URLSearchParams({ workspaceId });
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }

  const response = await fetch(`/api/v1/frontend/${action}?${query}`, {
    method: "GET",
    headers: {},
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
        : "Frontend request failed. Reload and try again.",
    );
  }

  return response.json();
}

export async function fetchFrontendOverview(
  workspaceId: string,
  jobId: string,
): Promise<FrontendOverviewResponse> {
  const res = await frontendRequest("overview", workspaceId, { jobId });
  return res as FrontendOverviewResponse;
}

export async function fetchFrontendComponents(
  workspaceId: string,
  jobId: string,
  query?: { search?: string; kind?: string },
): Promise<FrontendComponentsResponse> {
  const res = await frontendRequest("components", workspaceId, {
    jobId,
    ...query,
  });
  return res as FrontendComponentsResponse;
}

export async function fetchFrontendComponentDetail(
  workspaceId: string,
  jobId: string,
  componentId: string,
): Promise<FrontendComponentDetailResponse> {
  const res = await frontendRequest("component", workspaceId, {
    jobId,
    componentId,
  });
  return res as FrontendComponentDetailResponse;
}

export async function fetchFrontendRoutes(
  workspaceId: string,
  jobId: string,
  query?: { framework?: string },
): Promise<FrontendRoutesResponse> {
  const res = await frontendRequest("routes", workspaceId, { jobId, ...query });
  return res as FrontendRoutesResponse;
}

export async function fetchFrontendHooks(
  workspaceId: string,
  jobId: string,
  query?: { componentId?: string; kind?: string },
): Promise<FrontendHooksResponse> {
  const res = await frontendRequest("hooks", workspaceId, { jobId, ...query });
  return res as FrontendHooksResponse;
}

export async function fetchFrontendContexts(
  workspaceId: string,
  jobId: string,
): Promise<FrontendContextsResponse> {
  const res = await frontendRequest("contexts", workspaceId, { jobId });
  return res as FrontendContextsResponse;
}

export async function fetchFrontendState(
  workspaceId: string,
  jobId: string,
  query?: { componentId?: string; kind?: string },
): Promise<FrontendStateResponse> {
  const res = await frontendRequest("state", workspaceId, { jobId, ...query });
  return res as FrontendStateResponse;
}

export async function fetchFrontendApiClients(
  workspaceId: string,
  jobId: string,
  query?: { componentId?: string; clientType?: string },
): Promise<FrontendApiClientsResponse> {
  const res = await frontendRequest("api-clients", workspaceId, {
    jobId,
    ...query,
  });
  return res as FrontendApiClientsResponse;
}
