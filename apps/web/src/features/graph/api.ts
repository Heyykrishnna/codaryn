import { z } from "zod";
import type {
  DependencyCycle,
  DependencyEdge,
  DependencyNode,
  GraphSnapshotResponse,
  ModuleCouplingMetric,
  UnresolvedReferencesResponse,
} from "@codaryn/contracts";

export async function graphRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  const query = new URLSearchParams({ workspaceId });
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined && value !== null) query.set(key, String(value));
  }

  const response = await fetch(`/api/v1/graph/${action}?${query}`, {
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
        : "Graph request failed. Reload and try again.",
    );
  }

  return response.json();
}

export async function fetchGraphSnapshot(
  workspaceId: string,
  jobId: string,
  query?: { search?: string; kind?: string; resolution?: string },
): Promise<GraphSnapshotResponse> {
  const res = await graphRequest("snapshot", workspaceId, { jobId, ...query });
  return res as GraphSnapshotResponse;
}

export async function fetchGraphNeighborhood(
  workspaceId: string,
  jobId: string,
  nodeId: string,
  depth: number = 1,
  direction: "incoming" | "outgoing" | "both" = "both",
): Promise<{ nodes: DependencyNode[]; edges: DependencyEdge[] }> {
  const res = await graphRequest("neighborhood", workspaceId, {
    jobId,
    nodeId,
    depth,
    direction,
  });
  return res as { nodes: DependencyNode[]; edges: DependencyEdge[] };
}

export async function fetchGraphCycles(
  workspaceId: string,
  jobId: string,
): Promise<{
  jobId: string;
  cycles: DependencyCycle[];
  totalCycles: number;
}> {
  const res = await graphRequest("cycles", workspaceId, { jobId });
  return res as {
    jobId: string;
    cycles: DependencyCycle[];
    totalCycles: number;
  };
}

export async function fetchUnresolvedReferences(
  workspaceId: string,
  jobId: string,
): Promise<UnresolvedReferencesResponse> {
  const res = await graphRequest("unresolved", workspaceId, { jobId });
  return res as UnresolvedReferencesResponse;
}

export async function fetchGraphMetrics(
  workspaceId: string,
  jobId: string,
): Promise<{
  jobId: string;
  metrics: ModuleCouplingMetric[];
  totalModules: number;
}> {
  const res = await graphRequest("metrics", workspaceId, { jobId });
  return res as {
    jobId: string;
    metrics: ModuleCouplingMetric[];
    totalModules: number;
  };
}
