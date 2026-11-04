import { backendRouteDetailResponseSchema } from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
import type {
  BackendOverviewResponse,
  BackendRoutesResponse,
  BackendControllersResponse,
  BackendServicesResponse,
  BackendRepositoriesResponse,
  BackendMiddlewareResponse,
  RequestFlowsResponse,
  BackendRouteDetailResponse,
} from "@codaryn/contracts";

export function backendRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  return workspaceRequest(
    "backend",
    action,
    workspaceId,
    input,
    false,
    "Backend request failed. Reload and try again.",
  );
}

export async function fetchBackendOverview(
  workspaceId: string,
  jobId: string,
): Promise<BackendOverviewResponse> {
  const res = await backendRequest("overview", workspaceId, { jobId });
  return res as BackendOverviewResponse;
}

export async function fetchBackendRoutes(
  workspaceId: string,
  jobId: string,
  query?: { framework?: string; method?: string; search?: string },
): Promise<BackendRoutesResponse> {
  const res = await backendRequest("routes", workspaceId, {
    jobId,
    ...query,
  });
  return res as BackendRoutesResponse;
}

export function fetchBackendRouteDetail(
  workspaceId: string,
  jobId: string,
  routeId: string,
): Promise<BackendRouteDetailResponse> {
  return workspaceRequest(
    "backend",
    `routes/${encodeURIComponent(routeId)}`,
    workspaceId,
    { jobId },
    false,
    "Route detail request failed.",
  ).then((value) => backendRouteDetailResponseSchema.parse(value));
}

export async function fetchBackendControllers(
  workspaceId: string,
  jobId: string,
  query?: { framework?: string; search?: string },
): Promise<BackendControllersResponse> {
  const res = await backendRequest("controllers", workspaceId, {
    jobId,
    ...query,
  });
  return res as BackendControllersResponse;
}

export async function fetchBackendServices(
  workspaceId: string,
  jobId: string,
  query?: { search?: string },
): Promise<BackendServicesResponse> {
  const res = await backendRequest("services", workspaceId, {
    jobId,
    ...query,
  });
  return res as BackendServicesResponse;
}

export async function fetchBackendRepositories(
  workspaceId: string,
  jobId: string,
  query?: { ormType?: string; search?: string },
): Promise<BackendRepositoriesResponse> {
  const res = await backendRequest("repositories", workspaceId, {
    jobId,
    ...query,
  });
  return res as BackendRepositoriesResponse;
}

export async function fetchBackendMiddleware(
  workspaceId: string,
  jobId: string,
  query?: { kind?: string; scope?: string; search?: string },
): Promise<BackendMiddlewareResponse> {
  const res = await backendRequest("middleware", workspaceId, {
    jobId,
    ...query,
  });
  return res as BackendMiddlewareResponse;
}

export async function fetchBackendRequestFlows(
  workspaceId: string,
  jobId: string,
  query?: { routePath?: string; httpMethod?: string },
): Promise<RequestFlowsResponse> {
  const res = await backendRequest("request-flows", workspaceId, {
    jobId,
    ...query,
  });
  return res as RequestFlowsResponse;
}
