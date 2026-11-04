import { workspaceRequest } from "@/src/lib/workspace-request";
import type {
  DependencyCycle,
  DependencyEdge,
  DependencyNode,
  GraphSnapshotResponse,
  ModuleCouplingMetric,
  UnresolvedReferencesResponse,
} from "@codaryn/contracts";

export function graphRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
): Promise<unknown> {
  return workspaceRequest(
    "graph",
    action,
    workspaceId,
    input,
    false,
    "Graph request failed. Reload and try again.",
  );
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
