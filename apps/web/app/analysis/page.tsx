"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  workspaceListSchema,
  type AnalysisJobSummary,
  type DiagnosticsResponse,
  type FileInventoryResponse,
  type SymbolInventoryResponse,
  type WorkspaceSummary,
} from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { control, button } from "@/src/features/repositories/api";
import {
  cancelAnalysisJob,
  fetchAnalysisJob,
  fetchDiagnostics,
  fetchFileInventory,
  fetchSymbols,
  retryAnalysisJob,
  AnalysisCoverageIndicators,
  AnalysisTimeline,
  DiagnosticsPanel,
  FileExplorer,
  FileTypeSummary,
  SymbolExplorer,
} from "@/src/features/analysis";

function AnalysisDashboard() {
  const {
    data: session,
    isPending,
    error: authError,
  } = authClient.useSession();
  const searchParams = useSearchParams();

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [jobId, setJobId] = useState("");
  const [inputJobId, setInputJobId] = useState("");
  const [job, setJob] = useState<AnalysisJobSummary | null>(null);
  const [inventory, setInventory] = useState<FileInventoryResponse | null>(
    null,
  );
  const [symbols, setSymbols] = useState<SymbolInventoryResponse | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticsResponse | null>(
    null,
  );

  const [activeTab, setActiveTab] = useState<
    "files" | "symbols" | "diagnostics"
  >("files");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!session) return;
    let current = true;
    fetch("/api/v1/workspace/list", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load workspaces");
        const list = workspaceListSchema.parse(await res.json());
        if (current) {
          setWorkspaces(list.workspaces);
          const initialWorkspace =
            searchParams.get("workspaceId") ??
            list.active ??
            list.workspaces[0]?.id ??
            "";
          setWorkspaceId(initialWorkspace);
          const urlJobId = searchParams.get("jobId");
          if (urlJobId) {
            setJobId(urlJobId);
            setInputJobId(urlJobId);
          }
        }
      })
      .catch(() => {
        if (current) setMessage("Unable to load workspaces. Reload to retry.");
      });
    return () => {
      current = false;
    };
  }, [session, searchParams]);

  useEffect(() => {
    if (!workspaceId || !jobId) return;
    let current = true;

    const poll = () => {
      Promise.all([
        fetchAnalysisJob(workspaceId, jobId),
        fetchFileInventory(workspaceId, jobId).catch(() => null),
        fetchSymbols(workspaceId, jobId).catch(() => null),
        fetchDiagnostics(workspaceId, jobId).catch(() => null),
      ])
        .then(([jobSummary, inv, syms, diags]) => {
          if (current) {
            setJob(jobSummary);
            setInventory(inv);
            setSymbols(syms);
            setDiagnostics(diags);
          }
        })
        .catch((err) => {
          if (current) {
            setMessage(
              err instanceof Error
                ? err.message
                : "Failed to load analysis details.",
            );
          }
        });
    };

    poll();

    const interval = setInterval(poll, 2500);

    return () => {
      current = false;
      clearInterval(interval);
    };
  }, [workspaceId, jobId]);

  async function handleCancel() {
    if (!workspaceId || !jobId) return;
    setBusy(true);
    setMessage("");
    try {
      const updated = await cancelAnalysisJob(workspaceId, jobId);
      setJob(updated);
      setMessage("Job cancellation requested.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cancel request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry() {
    if (!workspaceId || !jobId) return;
    setBusy(true);
    setMessage("");
    try {
      const retried = await retryAnalysisJob(workspaceId, jobId);
      setJob(retried);
      setMessage("Job retry scheduled.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Retry request failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputJobId.trim()) return;
    setJobId(inputJobId.trim());
    setMessage("");
  }

  if (isPending) {
    return <output className="block p-8">Loading analysis dashboard…</output>;
  }

  if (authError) {
    return (
      <p role="alert" className="p-8">
        Unable to verify your session. Reload to retry.
      </p>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">
          TypeScript Analysis Foundation
        </h1>
        <p className="mt-2 text-neutral-600">
          Sign in to inspect static analysis jobs, symbols, AST structures, and
          diagnostics.
        </p>
        <Link
          href="/workspace"
          className="mt-4 inline-block text-neutral-800 underline"
        >
          Sign in to continue
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-dotted border-neutral-200 pb-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-semibold">
            codaryn
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-neutral-600">
            <Link href="/repositories" className="hover:text-neutral-900">
              Repositories
            </Link>
            <Link href="/studio" className="hover:text-neutral-900">
              Studio
            </Link>
            <Link href="/analysis" className="font-semibold text-neutral-800">
              Analysis
            </Link>
            <Link href="/graph" className="hover:text-neutral-900">
              Graph
            </Link>
            <Link href="/frontend" className="hover:text-neutral-900">
              Frontend Explorer
            </Link>
            <Link href="/backend" className="hover:text-neutral-900">
              Backend Explorer
            </Link>
          </nav>
        </div>
        <Link href="/workspace" className="text-sm text-neutral-800">
          Workspace settings
        </Link>
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          TypeScript Static Analysis
        </h1>
        <p className="text-sm text-neutral-600">
          Deep AST symbol extraction, multi-project tsconfig discovery, and
          syntax diagnostic collection.
        </p>
      </div>

      <output aria-live="polite" className="text-sm text-neutral-600">
        {busy ? "Working…" : message}
      </output>

      <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5 shadow-xs sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-neutral-700">
            <span>Workspace</span>
            <select
              className={control}
              value={workspaceId}
              disabled={busy}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                setJob(null);
                setJobId("");
                setInputJobId("");
              }}
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </label>

          <form onSubmit={handleLookup} className="flex flex-1 items-end gap-2">
            <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-neutral-700">
              <span>Job ID</span>
              <input
                type="text"
                className={control}
                placeholder="Enter analysis job UUID"
                value={inputJobId}
                onChange={(e) => setInputJobId(e.target.value)}
              />
            </label>
            <button
              type="submit"
              className={button}
              disabled={busy || !inputJobId.trim()}
            >
              Inspect Job
            </button>
          </form>
        </div>

        {job && (
          <div className="flex items-center gap-2">
            {job.status === "running" && (
              <button
                type="button"
                className="rounded-md border border-neutral-500 bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100"
                disabled={busy}
                onClick={handleCancel}
              >
                Cancel Analysis
              </button>
            )}
            {(job.status === "failed" || job.status === "cancelled") && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={handleRetry}
              >
                Retry Analysis
              </button>
            )}
          </div>
        )}
      </div>

      {job && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dotted border-neutral-200 bg-neutral-50 p-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-neutral-700">
                Job: {job.id}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase ${
                  job.status === "completed"
                    ? "bg-neutral-100 text-neutral-800"
                    : job.status === "running"
                      ? "bg-neutral-100 text-neutral-800 motion-safe:animate-pulse"
                      : job.status === "failed"
                        ? "bg-neutral-100 text-neutral-800"
                        : "bg-neutral-200 text-neutral-700"
                }`}
              >
                {job.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-neutral-600">
              <span>
                Current Stage:{" "}
                <strong className="text-neutral-900 capitalize">
                  {job.currentStage}
                </strong>
              </span>
              <span>Retries: {job.retries}</span>
              <Link
                href={`/graph?workspaceId=${workspaceId}&jobId=${job.id}`}
                className="font-medium text-neutral-800 underline"
              >
                Dependency Graph →
              </Link>
              <Link
                href={`/frontend?workspaceId=${workspaceId}&jobId=${job.id}`}
                className="font-medium text-neutral-800 underline"
              >
                Frontend Explorer →
              </Link>
              <Link
                href={`/backend?workspaceId=${workspaceId}&jobId=${job.id}`}
                className="font-medium text-neutral-800 underline"
              >
                Backend Explorer →
              </Link>
              {job.completedAt && (
                <span>
                  Duration:{" "}
                  {new Date(job.completedAt).getTime() -
                    new Date(job.createdAt).getTime()}
                  ms
                </span>
              )}
            </div>
          </div>

          <AnalysisCoverageIndicators
            job={job}
            inventory={inventory}
            symbols={symbols}
            diagnostics={diagnostics}
          />

          <AnalysisTimeline
            stages={job.stages}
            currentStage={job.currentStage}
          />

          <div className="flex flex-col gap-4">
            <div className="border-b border-dotted border-neutral-200">
              <nav className="flex space-x-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("files")}
                  className={`border-b-2 pb-3 text-sm font-medium ${
                    activeTab === "files"
                      ? "border-neutral-500 text-neutral-800"
                      : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-700"
                  }`}
                >
                  Files ({inventory?.summary.totalFiles ?? job.fileCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("symbols")}
                  className={`border-b-2 pb-3 text-sm font-medium ${
                    activeTab === "symbols"
                      ? "border-neutral-500 text-neutral-800"
                      : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-700"
                  }`}
                >
                  Symbols ({symbols?.totalCount ?? job.symbolCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("diagnostics")}
                  className={`border-b-2 pb-3 text-sm font-medium ${
                    activeTab === "diagnostics"
                      ? "border-neutral-500 text-neutral-800"
                      : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-700"
                  }`}
                >
                  Diagnostics (
                  {diagnostics?.diagnostics.length ?? job.diagnosticCount})
                </button>
              </nav>
            </div>

            {activeTab === "files" && inventory && (
              <div className="flex flex-col gap-6">
                <FileTypeSummary summary={inventory.summary} />
                <FileExplorer files={inventory.files} />
              </div>
            )}

            {activeTab === "symbols" && symbols && (
              <SymbolExplorer symbols={symbols} />
            )}

            {activeTab === "diagnostics" && diagnostics && (
              <DiagnosticsPanel diagnostics={diagnostics.diagnostics} />
            )}
          </div>
        </div>
      )}

      {!job && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dotted border-neutral-300 p-12 text-center">
          <p className="text-sm font-medium text-neutral-700">
            No active analysis job selected
          </p>
          <p className="mt-1 text-xs text-neutral-600">
            Enter a Job ID above to inspect stage progress, symbol inventory,
            and syntax diagnostics.
          </p>
        </div>
      )}
    </main>
  );
}

export default function AnalysisPage() {
  return (
    <Suspense
      fallback={
        <output className="block p-8">Loading analysis dashboard…</output>
      }
    >
      <AnalysisDashboard />
    </Suspense>
  );
}
