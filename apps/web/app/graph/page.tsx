"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  workspaceListSchema,
  type DependencyCycle,
  type DependencyEdge,
  type DependencyNode,
  type GraphSnapshotResponse,
  type ResolvedSymbolReference,
  type WorkspaceSummary,
} from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { control, button } from "@/src/features/repositories/api";
import {
  fetchGraphCycles,
  fetchGraphNeighborhood,
  fetchGraphSnapshot,
  fetchUnresolvedReferences,
  DependencyCyclesPanel,
  DependencyGraphView,
  ModuleMetricsPanel,
  NeighborhoodPanel,
  SourceEvidenceInspector,
  UnresolvedReferencesPanel,
} from "@/src/features/graph";

function GraphDashboard() {
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

  const [snapshot, setSnapshot] = useState<GraphSnapshotResponse | null>(null);
  const [cycles, setCycles] = useState<DependencyCycle[]>([]);
  const [unresolved, setUnresolved] = useState<ResolvedSymbolReference[]>([]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<DependencyEdge | null>(null);
  const [neighborhood, setNeighborhood] = useState<{
    nodes: DependencyNode[];
    edges: DependencyEdge[];
  } | null>(null);
  const [neighborhoodDepth, setNeighborhoodDepth] = useState(1);
  const [neighborhoodDirection, setNeighborhoodDirection] = useState<
    "incoming" | "outgoing" | "both"
  >("both");

  const [activeTab, setActiveTab] = useState<
    "graph" | "cycles" | "unresolved" | "metrics"
  >("graph");
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

    Promise.all([
      fetchGraphSnapshot(workspaceId, jobId),
      fetchGraphCycles(workspaceId, jobId).catch(() => ({
        jobId,
        cycles: [],
        totalCycles: 0,
      })),
      fetchUnresolvedReferences(workspaceId, jobId).catch(() => ({
        jobId,
        references: [],
        totalCount: 0,
      })),
    ])
      .then(([snap, cyc, unres]) => {
        if (current) {
          setSnapshot(snap);
          setCycles(cyc.cycles);
          setUnresolved(unres.references);
          setSelectedNodeId((currentSelected) =>
            currentSelected ? currentSelected : (snap.nodes[0]?.id ?? null),
          );
        }
      })
      .catch((err) => {
        if (current) {
          setMessage(
            err instanceof Error ? err.message : "Failed to load graph data.",
          );
        }
      });

    return () => {
      current = false;
    };
  }, [workspaceId, jobId]);

  useEffect(() => {
    if (!workspaceId || !jobId || !selectedNodeId) return;
    let current = true;

    fetchGraphNeighborhood(
      workspaceId,
      jobId,
      selectedNodeId,
      neighborhoodDepth,
      neighborhoodDirection,
    )
      .then((res) => {
        if (current) setNeighborhood(res);
      })
      .catch(() => {
        if (current) setNeighborhood(null);
      });

    return () => {
      current = false;
    };
  }, [
    workspaceId,
    jobId,
    selectedNodeId,
    neighborhoodDepth,
    neighborhoodDirection,
  ]);

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputJobId.trim()) return;
    setBusy(true);
    setJobId(inputJobId.trim());
    setSelectedNodeId(null);
    setSelectedEdge(null);
    setMessage("");
    setBusy(false);
  }

  if (isPending) {
    return <output className="block p-8">Loading dependency graph…</output>;
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
          Symbol &amp; Dependency Graph
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Sign in to inspect dependency graphs, circular imports, and module
          metrics.
        </p>
        <Link
          href="/workspace"
          className="mt-4 inline-block text-indigo-600 underline dark:text-indigo-400"
        >
          Sign in to continue
        </Link>
      </main>
    );
  }

  const selectedNode =
    snapshot?.nodes.find((n) => n.id === selectedNodeId) ?? null;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-semibold">
            codaryn
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link
              href="/repositories"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Repositories
            </Link>
            <Link
              href="/studio"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Studio
            </Link>
            <Link
              href="/analysis"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Analysis
            </Link>
            <Link
              href="/graph"
              className="font-semibold text-indigo-600 dark:text-indigo-400"
            >
              Dependency Graph
            </Link>
            <Link
              href="/frontend"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Frontend Explorer
            </Link>
          </nav>
        </div>
        <Link
          href="/workspace"
          className="text-sm text-indigo-600 dark:text-indigo-400"
        >
          Workspace settings
        </Link>
      </header>

      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Symbol Resolution &amp; Dependency Graph
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Navigate multi-module dependency relationships, detect circular
          imports, and audit coupling metrics.
        </p>
      </div>

      <output
        aria-live="polite"
        className="text-sm text-zinc-600 dark:text-zinc-300"
      >
        {busy ? "Working…" : message}
      </output>

      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-xs sm:flex-row sm:items-end sm:justify-between dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <span>Workspace</span>
            <select
              className={control}
              value={workspaceId}
              disabled={busy}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                setSnapshot(null);
                setJobId("");
                setInputJobId("");
                setSelectedNodeId(null);
                setSelectedEdge(null);
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
            <label className="flex flex-1 flex-col gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
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
              Inspect Graph
            </button>
          </form>
        </div>
      </div>

      {snapshot && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="block text-xs font-medium text-zinc-500 uppercase">
                Total Modules
              </span>
              <span className="mt-1 block text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {snapshot.totalNodes}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="block text-xs font-medium text-zinc-500 uppercase">
                Relationships
              </span>
              <span className="mt-1 block text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {snapshot.totalEdges}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="block text-xs font-medium text-zinc-500 uppercase">
                Circular Loops
              </span>
              <span
                className={`mt-1 block text-2xl font-bold ${
                  snapshot.totalCycles > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {snapshot.totalCycles}
              </span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <span className="block text-xs font-medium text-zinc-500 uppercase">
                Unresolved Refs
              </span>
              <span
                className={`mt-1 block text-2xl font-bold ${
                  unresolved.length > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {unresolved.length}
              </span>
            </div>
          </div>

          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <nav className="flex space-x-6">
              <button
                type="button"
                onClick={() => setActiveTab("graph")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "graph"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                Graph &amp; Neighborhood
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("cycles")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "cycles"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                Cycles ({cycles.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("unresolved")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "unresolved"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                Unresolved ({unresolved.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("metrics")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "metrics"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                Coupling Metrics ({snapshot.metrics.length})
              </button>
            </nav>
          </div>

          {activeTab === "graph" && (
            <div className="flex flex-col gap-6">
              <DependencyGraphView
                nodes={snapshot.nodes}
                edges={snapshot.edges}
                selectedNodeId={selectedNodeId}
                onSelectNode={(nodeId) => {
                  setSelectedNodeId(nodeId);
                  setSelectedEdge(null);
                }}
                onSelectEdge={(edge) => setSelectedEdge(edge)}
              />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <NeighborhoodPanel
                  selectedNode={selectedNode}
                  neighborhood={neighborhood}
                  depth={neighborhoodDepth}
                  direction={neighborhoodDirection}
                  onDepthChange={setNeighborhoodDepth}
                  onDirectionChange={setNeighborhoodDirection}
                  onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                />

                {selectedEdge ? (
                  <SourceEvidenceInspector
                    edge={selectedEdge}
                    onClose={() => setSelectedEdge(null)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 p-8 text-center text-xs text-zinc-500 dark:border-zinc-800">
                    Click any edge line in the interactive graph above to
                    inspect its source evidence ranges and resolution status.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "cycles" && (
            <DependencyCyclesPanel
              cycles={cycles}
              onSelectNode={(nodeId) => {
                setSelectedNodeId(nodeId);
                setActiveTab("graph");
              }}
            />
          )}

          {activeTab === "unresolved" && (
            <UnresolvedReferencesPanel references={unresolved} />
          )}

          {activeTab === "metrics" && (
            <ModuleMetricsPanel metrics={snapshot.metrics} />
          )}
        </div>
      )}

      {!snapshot && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No active dependency graph selected
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Enter an analysis Job ID above to inspect interactive dependency
            graphs, detect cycles, and review module coupling metrics.
          </p>
        </div>
      )}
    </main>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={<output className="block p-8">Loading graph dashboard…</output>}
    >
      <GraphDashboard />
    </Suspense>
  );
}
