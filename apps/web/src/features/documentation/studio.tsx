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
  const currentDoc = viewState.key === requestKey ? viewState.document : null;
  const summaries = viewState.key === requestKey ? viewState.summaries : [];
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
            err instanceof Error ? err.message : "Failed to load documentation",
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
    <div className="flex h-full bg-neutral-50 text-neutral-900">
      <aside className="flex w-80 flex-col border-r border-dotted border-neutral-200 bg-white">
        <div className="border-b border-dotted border-neutral-200 p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              aria-label="Search documentation"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-dotted border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-neutral-800 px-3 py-1.5 text-sm font-medium text-neutral-950 hover:bg-neutral-800 disabled:opacity-50"
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
              className="mt-2 text-xs font-medium text-neutral-800 hover:underline"
            >
              Clear search results
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {searchResults !== null ? (
            <div className="space-y-2">
              <h4 className="px-2 text-xs font-semibold text-neutral-600 uppercase">
                Search Results ({searchResults.length})
              </h4>
              {searchResults.length === 0 ? (
                <p className="p-2 text-xs text-neutral-600">
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
                    className="w-full rounded-lg border border-transparent p-2.5 text-left text-xs transition-colors hover:border-neutral-200 hover:bg-neutral-100"
                  >
                    <p className="font-semibold text-neutral-900">
                      {r.documentTitle} · {r.sectionTitle}
                    </p>
                    <p className="mt-1 line-clamp-2 text-neutral-600">
                      {r.snippet}
                    </p>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-1">
              <h4 className="px-3 py-1.5 text-xs font-semibold text-neutral-600 uppercase">
                Documentation Catalog
              </h4>
              {templateList.map((tmpl) => {
                const summary = summaries.find((s) => s.templateId === tmpl.id);
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
                        ? "bg-neutral-100 font-semibold text-neutral-800"
                        : "text-neutral-700 hover:bg-neutral-100"
                    }`}
                  >
                    <span>{tmpl.label}</span>
                    {summary && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
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

      <main className="flex flex-1 flex-col overflow-hidden bg-white">
        <header className="flex flex-wrap items-center justify-between border-b border-dotted border-neutral-200 px-8 py-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">
              {currentDoc?.title || "Documentation Studio"}
            </h2>
            {currentDoc && (
              <p className="mt-1 text-xs text-neutral-600">
                Repository:{" "}
                <strong>{currentDoc.metadata.repositoryName}</strong> | Commit:{" "}
                <code className="rounded bg-neutral-100 px-1 py-0.5">
                  {currentDoc.commitSha.slice(0, 7)}
                </code>{" "}
                | Analyzer: v{currentDoc.metadata.analyzerVersion} | Words:{" "}
                {currentDoc.metadata.wordCount} | Evidence links:{" "}
                {currentDoc.metadata.evidenceCount}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!currentDoc}
              onClick={handleCopyMarkdown}
              className="rounded-lg border border-dotted border-neutral-300 bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {copied ? "Copied!" : "Copy Markdown"}
            </button>
            <button
              type="button"
              disabled={!currentDoc}
              onClick={() => setShowExportModal(true)}
              className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-neutral-800 disabled:opacity-50"
            >
              Export Document
            </button>
          </div>
        </header>

        {error && (
          <div className="m-6 rounded-lg border border-neutral-500 bg-neutral-100 p-4 text-sm text-neutral-800">
            <p className="font-semibold">Error loading document</p>
            <p>{error}</p>
          </div>
        )}

        {loading && !error && (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-neutral-600">
              <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-neutral-500 border-t-transparent" />
              <p className="text-sm font-medium">
                Generating documentation from snapshot...
              </p>
            </div>
          </div>
        )}

        {!loading && !error && currentDoc && (
          <div className="flex-1 overflow-y-auto px-10 py-8">
            <article className="prose prose-slate max-w-4xl space-y-6">
              {currentDoc.sections.map((section) => (
                <section
                  key={section.id}
                  className="border-b border-dotted border-neutral-100 pb-6"
                >
                  {section.level === 1 && (
                    <h2 className="mb-3 text-xl font-bold text-neutral-900">
                      {section.title}
                    </h2>
                  )}
                  {section.level === 2 && (
                    <h3 className="mb-2 text-lg font-semibold text-neutral-800">
                      {section.title}
                    </h3>
                  )}
                  {section.level >= 3 && (
                    <h4 className="mb-2 text-base font-semibold text-neutral-800">
                      {section.title}
                    </h4>
                  )}

                  {section.diagramPreview && (
                    <div className="my-4 rounded-lg border border-dotted border-neutral-200 bg-neutral-50 p-4">
                      <p className="mb-2 text-xs font-semibold text-neutral-600 uppercase">
                        Diagram Specification (Mermaid)
                      </p>
                      <pre className="overflow-x-auto rounded bg-white p-3 font-mono text-xs text-neutral-900">
                        {section.diagramPreview}
                      </pre>
                    </div>
                  )}

                  <div className="text-sm leading-relaxed whitespace-pre-wrap text-neutral-700">
                    {section.content}
                  </div>

                  {section.evidence && section.evidence.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs font-semibold text-neutral-600">
                        Evidence:
                      </span>
                      {section.evidence.map((ev, i) => (
                        <span
                          key={`${ev.path}_${ev.startLine}_${i}`}
                          className="rounded border border-neutral-500 bg-neutral-100 px-2 py-0.5 font-mono text-xs text-neutral-800"
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
          <div className="w-96 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900">
              Export Document
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Select format for {currentDoc?.title}.
            </p>
            <div className="mt-4 space-y-2">
              {(["markdown", "pdf", "json"] as const).map((fmt) => (
                <label
                  key={fmt}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-dotted border-neutral-200 p-3 hover:bg-neutral-50"
                >
                  <input
                    type="radio"
                    name="docExportFormat"
                    value={fmt}
                    checked={exportFormat === fmt}
                    onChange={() => setExportFormat(fmt)}
                    className="accent-neutral-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 uppercase">
                      {fmt === "pdf" ? "HTML / PDF Printable" : fmt}
                    </p>
                    <p className="text-xs text-neutral-600">
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
              <p className="mt-3 text-xs text-neutral-800">{exportError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={handleExport}
                className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-neutral-800 disabled:opacity-50"
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
