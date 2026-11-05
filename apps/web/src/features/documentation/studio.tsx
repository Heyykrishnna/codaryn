"use client";

import { useEffect, useState, useTransition } from "react";
import type {
  DocumentSearchResult,
  DocumentTemplateId,
  ExportFormat,
  GeneratedDocument,
} from "@codaryn/contracts";
import {
  fetchDocument,
  fetchDocumentsList,
  searchDocumentation,
  exportDocument,
} from "./api";
import { checkExportStatus } from "../architecture/api";

const templateList: Array<{ id: DocumentTemplateId; label: string }> = [
  { id: "overview", label: "Project Overview" },
  { id: "architecture", label: "System Architecture" },
  { id: "frontend", label: "Frontend Architecture" },
  { id: "backend", label: "Backend Architecture" },
  { id: "api", label: "API Reference" },
  { id: "schema", label: "Database Schema" },
  { id: "dependencies", label: "Dependencies" },
  { id: "execution", label: "Execution & Call Graph" },
  { id: "infrastructure", label: "Infrastructure & CI/CD" },
  { id: "security", label: "Security & Limitations" },
];

interface DocumentViewState {
  key: string;
  document: GeneratedDocument | null;
  summaries: Array<{
    templateId: DocumentTemplateId;
    title: string;
    version: number;
    wordCount: number;
    evidenceCount: number;
  }>;
  error: string | null;
}

export function DocumentationStudio({
  workspaceId,
  jobId,
}: {
  workspaceId: string;
  jobId: string;
}) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplateId>("overview");
  const [, startTransition] = useTransition();

  const requestKey = `${workspaceId}:${jobId}:${selectedTemplate}`;
  const [viewState, setViewState] = useState<DocumentViewState>({
    key: "",
    document: null,
    summaries: [],
    error: null,
  });

  const loading = viewState.key !== requestKey && !viewState.error;
  const currentDoc =
    viewState.key === requestKey ? viewState.document : null;
  const summaries =
    viewState.key === requestKey ? viewState.summaries : [];
  const error = viewState.key === requestKey ? viewState.error : null;

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<
    DocumentSearchResult[] | null
  >(null);
  const [searching, setSearching] = useState<boolean>(false);

  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("markdown");
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchDocument(workspaceId, jobId, selectedTemplate),
      fetchDocumentsList(workspaceId, jobId),
    ])
      .then(([doc, list]) => {
        if (!active) return;
        setViewState({
          key: requestKey,
          document: doc,
          summaries: list,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setViewState({
          key: requestKey,
          document: null,
          summaries: [],
          error:
            err instanceof Error
              ? err.message
              : "Failed to load documentation",
        });
      });

    return () => {
      active = false;
    };
  }, [workspaceId, jobId, selectedTemplate, requestKey]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const results = await searchDocumentation(workspaceId, jobId, {
        query: searchQuery.trim(),
        limit: 20,
      });
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (currentDoc) {
      navigator.clipboard.writeText(currentDoc.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const job = await exportDocument(
        workspaceId,
        jobId,
        selectedTemplate,
        exportFormat,
      );

      let status = job.status;
      let attempts = 0;
      while (status === "queued" || status === "running") {
        if (attempts++ > 20) break;
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const updated = await checkExportStatus(workspaceId, jobId, job.id);
        status = updated.status;
        if (status === "completed") {
          const downloadUrl = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analysis/${encodeURIComponent(jobId)}/exports/${encodeURIComponent(job.id)}/download`;
          const anchor = document.createElement("a");
          anchor.href = downloadUrl;
          anchor.download = "";
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);
          setShowExportModal(false);
          setExporting(false);
          return;
        }
        if (status === "failed") {
          throw new Error(updated.errorMessage || "Export job failed");
        }
      }
      setExporting(false);
    } catch (err: unknown) {
      setExportError(err instanceof Error ? err.message : "Export failed");
      setExporting(false);
    }
  };

  return (
    <div className="flex h-full bg-slate-50 text-slate-900">
      <aside className="w-80 border-r border-slate-200 bg-white flex flex-col">
        <div className="border-b border-slate-200 p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              aria-label="Search documentation"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Search
            </button>
          </form>
          {searchResults !== null && (
            <button
              type="button"
              onClick={() => {
                setSearchResults(null);
                setSearchQuery("");
              }}
              className="mt-2 text-xs font-medium text-indigo-600 hover:underline"
            >
              Clear search results
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {searchResults !== null ? (
            <div className="space-y-2">
              <h4 className="px-2 text-xs font-semibold uppercase text-slate-500">
                Search Results ({searchResults.length})
              </h4>
              {searchResults.length === 0 ? (
                <p className="p-2 text-xs text-slate-500">
                  No matching documentation sections found.
                </p>
              ) : (
                searchResults.map((r, i) => (
                  <button
                    key={`${r.templateId}_${r.sectionId}_${i}`}
                    type="button"
                    onClick={() => {
                      startTransition(() => {
                        setSelectedTemplate(r.templateId);
                        setSearchResults(null);
                      });
                    }}
                    className="w-full text-left rounded-lg p-2.5 text-xs hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
                  >
                    <p className="font-semibold text-slate-900">
                      {r.documentTitle} · {r.sectionTitle}
                    </p>
                    <p className="mt-1 text-slate-600 line-clamp-2">
                      {r.snippet}
                    </p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <h4 className="px-3 py-1.5 text-xs font-semibold uppercase text-slate-500">
                Documentation Catalog
              </h4>
              {templateList.map((tmpl) => {
                const summary = summaries.find(
                  (s) => s.templateId === tmpl.id,
                );
                const isSelected = selectedTemplate === tmpl.id;

                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      startTransition(() => {
                        setSelectedTemplate(tmpl.id);
                      });
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-indigo-50 font-semibold text-indigo-700"
                        : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>{tmpl.label}</span>
                    {summary && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {summary.evidenceCount} ev
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-white">
        <header className="flex flex-wrap items-center justify-between border-b border-slate-200 px-8 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {currentDoc?.title || "Documentation Studio"}
            </h2>
            {currentDoc && (
              <p className="mt-1 text-xs text-slate-500">
                Repository: <strong>{currentDoc.metadata.repositoryName}</strong> |
                Commit: <code className="bg-slate-100 px-1 py-0.5 rounded">{currentDoc.commitSha.slice(0, 7)}</code> |
                Analyzer: v{currentDoc.metadata.analyzerVersion} |
                Words: {currentDoc.metadata.wordCount} |
                Evidence links: {currentDoc.metadata.evidenceCount}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!currentDoc}
              onClick={handleCopyMarkdown}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {copied ? "Copied!" : "Copy Markdown"}
            </button>
            <button
              type="button"
              disabled={!currentDoc}
              onClick={() => setShowExportModal(true)}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Export Document
            </button>
          </div>
        </header>

        {error && (
          <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Error loading document</p>
            <p>{error}</p>
          </div>
        )}

        {loading && !error && (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-slate-500">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto" />
              <p className="text-sm font-medium">Generating documentation from snapshot...</p>
            </div>
          </div>
        )}

        {!loading && !error && currentDoc && (
          <div className="flex-1 overflow-y-auto px-10 py-8">
            <article className="prose prose-slate max-w-4xl space-y-6">
              {currentDoc.sections.map((section) => (
                <section key={section.id} className="border-b border-slate-100 pb-6">
                  {section.level === 1 && (
                    <h2 className="text-xl font-bold text-slate-900 mb-3">
                      {section.title}
                    </h2>
                  )}
                  {section.level === 2 && (
                    <h3 className="text-lg font-semibold text-slate-800 mb-2">
                      {section.title}
                    </h3>
                  )}
                  {section.level >= 3 && (
                    <h4 className="text-base font-semibold text-slate-800 mb-2">
                      {section.title}
                    </h4>
                  )}

                  {section.diagramPreview && (
                    <div className="my-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
                        Diagram Specification (Mermaid)
                      </p>
                      <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-100 font-mono">
                        {section.diagramPreview}
                      </pre>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {section.content}
                  </div>

                  {section.evidence && section.evidence.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs font-semibold text-slate-500">
                        Evidence:
                      </span>
                      {section.evidence.map((ev, i) => (
                        <span
                          key={`${ev.path}_${ev.startLine}_${i}`}
                          className="rounded bg-indigo-50 px-2 py-0.5 text-xs font-mono text-indigo-700 border border-indigo-100"
                        >
                          {ev.path}:{ev.startLine}-{ev.endLine}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </article>
          </div>
        )}
      </main>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-96 rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-900">
              Export Document
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Select format for {currentDoc?.title}.
            </p>
            <div className="mt-4 space-y-2">
              {(["markdown", "pdf", "json"] as const).map((fmt) => (
                <label
                  key={fmt}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="docExportFormat"
                    value={fmt}
                    checked={exportFormat === fmt}
                    onChange={() => setExportFormat(fmt)}
                    className="accent-indigo-600"
                  />
                  <div>
                    <p className="text-sm font-semibold uppercase text-slate-900">
                      {fmt === "pdf" ? "HTML / PDF Printable" : fmt}
                    </p>
                    <p className="text-xs text-slate-500">
                      {fmt === "markdown"
                        ? "Formatted Markdown document"
                        : fmt === "pdf"
                          ? "Print-ready report view"
                          : "Structured JSON model"}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {exportError && (
              <p className="mt-3 text-xs text-red-600">{exportError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={handleExport}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {exporting ? "Exporting..." : "Download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
