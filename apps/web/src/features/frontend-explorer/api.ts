import { workspaceRequest } from "@/src/lib/workspace-request";
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

export function frontendRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  return workspaceRequest(
    "frontend",
    action,
    workspaceId,
    input,
    false,
    "Frontend request failed. Reload and try again.",
  );
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
