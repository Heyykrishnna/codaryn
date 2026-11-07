"use client";
import { UnresolvedReferencesPanel } from "./unresolved";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  graphSnapshotResponseSchema,
  unresolvedReferencesResponseSchema,
  dependencyNodeSchema,
  dependencyEdgeSchema,
  type DependencyEdge,
} from "@codaryn/contracts";
import { useArtifactResource } from "@/src/lib/artifact-resource";
import { control } from "@/src/features/repositories/api";
import { jobsSchema, comparisonUrl } from "@/src/features/comparisons/api";
import { DependencyGraphView } from "./view";
import { SourceEvidenceInspector } from "./evidence";
import { DependencyCyclesPanel } from "./cycles";
import { ModuleMetricsPanel } from "./metrics";
import { NeighborhoodPanel } from "./neighborhood";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
const neighborhoodSchema = z.object({
  nodes: z.array(dependencyNodeSchema),
  edges: z.array(dependencyEdgeSchema),
  truncated: z.boolean().optional(),
});
export function GraphExplorer({
  workspaceId,
  initialJobId,
}: Readonly<{ workspaceId: string; initialJobId?: string }>) {
  const [jobId, setJobId] = useState(initialJobId ?? ""),
    [page, setPage] = useState(1),
    [showUnresolved, setShowUnresolved] = useState(false),
    [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [edge, setEdge] = useState<DependencyEdge | null>(null),
    [depth, setDepth] = useState(1),
    [direction, setDirection] = useState<"incoming" | "outgoing" | "both">(
      "both",
    ),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  const jobs = useArtifactResource(
      comparisonUrl("jobs", workspaceId, { _retry: refresh }),
      jobsSchema,
    ),
    url = jobId
      ? `/api/v1/graph/snapshot?${new URLSearchParams({ workspaceId, jobId, page: String(page), search: query, _retry: String(refresh) })}`
      : null,
    snapshot = useArtifactResource(url, graphSnapshotResponseSchema),
    unresolved = useArtifactResource(
      jobId && showUnresolved
        ? `/api/v1/graph/unresolved?${new URLSearchParams({ workspaceId, jobId, _retry: String(refresh) })}`
        : null,
      unresolvedReferencesResponseSchema,
    ),
    neighborhood = useArtifactResource(
      jobId && selected
        ? `/api/v1/graph/neighborhood?${new URLSearchParams({ workspaceId, jobId, nodeId: selected, depth: String(depth), direction })}`
        : null,
      neighborhoodSchema,
    );
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <p>
        Load a bounded page of dependency evidence. Search covers the stored
        graph; the graph filter narrows the current page. Select nodes with a
        mouse or keyboard to explore their neighborhood.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          Analysis job
          <select
            className={control}
            value={jobId}
            onChange={(e) => {
              setJobId(e.target.value);
              setPage(1);
              setSelected(null);
              setEdge(null);
            }}
          >
            <option value="">Select an analysis</option>
            {jobId && !jobs.data?.jobs.some((job) => job.id === jobId) && (
              <option value={jobId}>
                Linked analysis {jobId.slice(0, 12)}
              </option>
            )}
            {jobs.data?.jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.commit_sha.slice(0, 12)} · {job.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          Search all graph nodes
          <input
            className={control}
            type="search"
            value={search}
            maxLength={256}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <button className={control} onClick={() => setRefresh((n) => n + 1)}>
          Refresh graph
        </button>
      </div>
      {jobs.loading && (
        <LoadingIndicator variant="inline" label="Loading analysis jobs…" />
      )}
      {jobs.data && !jobs.data.jobs.length && (
        <p className="text-xs text-neutral-600">
          No analysis jobs are available. Create an analysis in Studio first.
        </p>
      )}
      {(jobs.error || snapshot.error || neighborhood.error) && (
        <p role="alert" className="text-xs text-neutral-800">
          {jobs.error || snapshot.error || neighborhood.error}
        </p>
      )}
      {snapshot.loading && (
        <div className="flex items-center justify-center py-8">
          <LoadingIndicator
            label="Loading graph page…"
            description="Extracting node topology and edge dependencies"
          />
        </div>
      )}
      {snapshot.data && (
        <>
          <div className="rounded-lg border border-dotted border-neutral-300 bg-white/40 px-3 py-2 font-mono text-xs text-neutral-600">
            Page {page} · {snapshot.data.nodes.length} of{" "}
            {snapshot.data.totalNodes} matching nodes. Up to 400 relationships
            within this page.{" "}
            {snapshot.data.truncated
              ? "Additional relationships or summaries were omitted by the display limit."
              : ""}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              className={control}
              disabled={page === 1}
              onClick={() => {
                setPage(page - 1);
                setSelected(null);
                setEdge(null);
              }}
            >
              Previous graph page
            </button>
            <button
              className={control}
              disabled={!snapshot.data.hasMore}
              onClick={() => {
                setPage(page + 1);
                setSelected(null);
                setEdge(null);
              }}
            >
              Next graph page
            </button>
          </div>
          <DependencyGraphView
            nodes={snapshot.data.nodes}
            edges={snapshot.data.edges}
            selectedNodeId={selected}
            onSelectNode={setSelected}
            onSelectEdge={setEdge}
          />
          {neighborhood.loading && (
            <LoadingIndicator
              variant="inline"
              label="Loading graph neighborhood…"
            />
          )}
          <NeighborhoodPanel
            selectedNode={
              snapshot.data.nodes.find((node) => node.id === selected) ??
              neighborhood.data?.nodes.find((node) => node.id === selected) ??
              null
            }
            neighborhood={neighborhood.data}
            depth={depth}
            direction={direction}
            onDepthChange={setDepth}
            onDirectionChange={setDirection}
            onSelectNode={setSelected}
          />
          {neighborhood.data?.truncated && (
            <p className="text-xs text-neutral-600">
              Neighborhood display limit reached. Use a smaller depth or a more
              specific node.
            </p>
          )}
          <SourceEvidenceInspector edge={edge} />
          <DependencyCyclesPanel
            cycles={snapshot.data.cycles}
            onSelectNode={setSelected}
          />
          <ModuleMetricsPanel metrics={snapshot.data.metrics} />
          <details
            onToggle={(event) => setShowUnresolved(event.currentTarget.open)}
            className="rounded-2xl border border-dotted border-neutral-300 bg-white p-4 text-xs text-neutral-900"
          >
            <summary className="cursor-pointer font-semibold text-neutral-950 focus-visible:outline-1 focus-visible:outline-neutral-400">
              Unresolved references
            </summary>
            {unresolved.loading && (
              <div className="py-2">
                <LoadingIndicator
                  variant="inline"
                  label="Loading unresolved evidence…"
                />
              </div>
            )}
            {unresolved.error && (
              <p role="alert" className="mt-2 text-xs text-neutral-800">
                {unresolved.error}
              </p>
            )}
            {unresolved.data && (
              <UnresolvedReferencesPanel
                references={unresolved.data.references}
              />
            )}
          </details>
        </>
      )}
    </div>
  );
}
