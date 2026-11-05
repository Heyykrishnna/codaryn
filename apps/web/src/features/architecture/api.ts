import {
  type DiagramGraph,
  type DiagramLayoutConfig,
  type DiagramType,
  type ExportJobResponse,
  type ExportRequest,
  type SavedDiagramLayout,
  diagramGraphSchema,
  exportJobResponseSchema,
  savedDiagramLayoutSchema,
} from "@codaryn/contracts";

export async function fetchDiagramGraph(
  workspaceId: string,
  jobId: string,
  type: DiagramType,
): Promise<DiagramGraph> {
  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/diagrams/${encodeURIComponent(type)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`Failed to load ${type} diagram graph`);
  }
  const data = await res.json();
  return diagramGraphSchema.parse(data);
}

export async function saveDiagramLayout(
  workspaceId: string,
  jobId: string,
  type: DiagramType,
  name: string,
  layoutConfig: DiagramLayoutConfig,
): Promise<SavedDiagramLayout> {
  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/diagrams/${encodeURIComponent(type)}/layouts`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, layoutConfig }),
    },
  );
  if (!res.ok) {
    throw new Error("Failed to save diagram layout");
  }
  const data = await res.json();
  return savedDiagramLayoutSchema.parse(data);
}

export async function fetchDiagramLayouts(
  workspaceId: string,
  jobId: string,
  type: DiagramType,
): Promise<SavedDiagramLayout[]> {
  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/diagrams/${encodeURIComponent(type)}/layouts`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return Array.isArray(data.layouts)
    ? data.layouts.map((item: unknown) => savedDiagramLayoutSchema.parse(item))
    : [];
}

export async function requestExport(
  workspaceId: string,
  jobId: string,
  request: ExportRequest,
): Promise<ExportJobResponse> {
  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/exports`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
  );
  if (!res.ok) {
    throw new Error("Failed to request export");
  }
  const data = await res.json();
  return exportJobResponseSchema.parse(data);
}

export async function checkExportStatus(
  workspaceId: string,
  jobId: string,
  exportId: string,
): Promise<ExportJobResponse> {
  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/exports/${encodeURIComponent(exportId)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error("Failed to check export status");
  }
  const data = await res.json();
  return exportJobResponseSchema.parse(data);
}
