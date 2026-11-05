"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  graphSnapshotResponseSchema,
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
const neighborhoodSchema = z.object({
  nodes: z.array(dependencyNodeSchema),
  edges: z.array(dependencyEdgeSchema),
  truncated: z.boolean().optional(),
});
export function GraphExplorer({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const [jobId, setJobId] = useState(""),
    [page, setPage] = useState(1),
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
      {jobs.loading && <output>Loading analyses…</output>}
      {jobs.data && !jobs.data.jobs.length && (
        <p>
          No analysis jobs are available. Create an analysis in Studio first.
        </p>
      )}
      {(jobs.error || snapshot.error || neighborhood.error) && (
        <p role="alert">{jobs.error || snapshot.error || neighborhood.error}</p>
      )}
      {snapshot.loading && <output>Loading graph page…</output>}
      {snapshot.data && (
        <>
          <output aria-live="polite">
            Page {page} · {snapshot.data.nodes.length} of{" "}
            {snapshot.data.totalNodes} matching nodes. Up to 400 relationships
            within this page.{" "}
            {snapshot.data.truncated
              ? "Additional relationships or summaries were omitted by the display limit."
              : ""}
          </output>
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
          <NeighborhoodPanel
            selectedNode={
              snapshot.data.nodes.find((node) => node.id === selected) ?? null
            }
            neighborhood={neighborhood.data}
            depth={depth}
            direction={direction}
            onDepthChange={setDepth}
            onDirectionChange={setDirection}
            onSelectNode={setSelected}
          />
          {neighborhood.data?.truncated && (
            <p>
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
        </>
      )}
    </div>
  );
}
