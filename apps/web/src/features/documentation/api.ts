import {
  type DocumentSearchQuery,
  type DocumentSearchResult,
  type DocumentTemplateId,
  type ExportFormat,
  type ExportJobResponse,
  type GeneratedDocument,
  documentSearchResultSchema,
  exportJobResponseSchema,
  generatedDocumentSchema,
} from "@codaryn/contracts";

export async function fetchDocument(
  workspaceId: string,
  jobId: string,
  templateId: DocumentTemplateId,
): Promise<GeneratedDocument> {
  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/documents/${encodeURIComponent(templateId)}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    throw new Error(`Failed to load ${templateId} document`);
  }
  const data = await res.json();
  return generatedDocumentSchema.parse(data);
}

export async function fetchDocumentsList(
  workspaceId: string,
  jobId: string,
): Promise<
  Array<{
    templateId: DocumentTemplateId;
    title: string;
    version: number;
    wordCount: number;
    evidenceCount: number;
  }>
> {
  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/documents`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return Array.isArray(data.documents) ? data.documents : [];
}

export async function searchDocumentation(
  workspaceId: string,
  jobId: string,
  searchQuery: DocumentSearchQuery,
): Promise<DocumentSearchResult[]> {
  const query = new URLSearchParams({
    q: searchQuery.query,
    limit: String(searchQuery.limit || 20),
  });
  if (searchQuery.templateId) {
    query.set("templateId", searchQuery.templateId);
  }

  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/documents/search?${query}`,
    { cache: "no-store" },
  );
  if (!res.ok) {
    return [];
  }
  const data = await res.json();
  return Array.isArray(data.results)
    ? data.results.map((r: unknown) => documentSearchResultSchema.parse(r))
    : [];
}

export async function exportDocument(
  workspaceId: string,
  jobId: string,
  templateId: DocumentTemplateId,
  format: ExportFormat,
): Promise<ExportJobResponse> {
  const res = await fetch(
    `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/exports`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jobId,
        exportType: "document",
        format,
        targetId: templateId,
      }),
    },
  );
  if (!res.ok) {
    throw new Error("Failed to export document");
  }
  const data = await res.json();
  return exportJobResponseSchema.parse(data);
}
