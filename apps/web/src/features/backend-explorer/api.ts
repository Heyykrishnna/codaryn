import { z } from "zod";
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

export async function backendRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  const query = new URLSearchParams({ workspaceId });
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }

  const response = await fetch(`/api/v1/backend/${action}?${query}`, {
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
        : "Backend request failed. Reload and try again.",
    );
  }

  return response.json();
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

export async function fetchBackendRouteDetail(
  workspaceId: string,
  jobId: string,
  routeId: string,
): Promise<BackendRouteDetailResponse> {
  const query = new URLSearchParams({ workspaceId, jobId });
  const response = await fetch(
    `/api/v1/backend/routes/${encodeURIComponent(routeId)}?${query}`,
    {
      method: "GET",
      headers: {},
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    },
  );

  if (!response.ok) {
    const error = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(await response.json().catch(() => null));
    throw new Error(
      error.success ? error.data.error.message : "Route detail request failed.",
    );
  }

  return response.json() as Promise<BackendRouteDetailResponse>;
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
