"use client";
import React from "react";
import type { DependencyEdge, DependencyNode } from "@codaryn/contracts";

export function NeighborhoodPanel({
  selectedNode,
  neighborhood,
  depth,
  direction,
  onDepthChange,
  onDirectionChange,
  onSelectNode,
}: Readonly<{
  selectedNode: DependencyNode | null;
  neighborhood: { nodes: DependencyNode[]; edges: DependencyEdge[] } | null;
  depth: number;
  direction: "incoming" | "outgoing" | "both";
  onDepthChange: (d: number) => void;
  onDirectionChange: (dir: "incoming" | "outgoing" | "both") => void;
  onSelectNode: (nodeId: string) => void;
}>) {
  if (!selectedNode) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 p-6 text-center text-xs text-zinc-500 dark:border-zinc-800">
        Select a node in the graph or table to inspect its incoming and outgoing
        neighborhood.
      </div>
    );
  }

  const incomingEdges =
    neighborhood?.edges.filter((e) => e.targetId === selectedNode.id) ?? [];
  const outgoingEdges =
    neighborhood?.edges.filter((e) => e.sourceId === selectedNode.id) ?? [];

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-2 border-b border-zinc-200 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <div>
          <span className="text-2xs font-semibold text-zinc-500 uppercase">
            Neighborhood Inspector
          </span>
          <h4 className="font-mono text-sm font-bold break-all text-zinc-900 dark:text-zinc-100">
            {selectedNode.path}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="neighborhood-depth-select" className="sr-only">
            Neighborhood Depth
          </label>
          <select
            id="neighborhood-depth-select"
            value={depth}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value={1}>1-hop (Direct)</option>
            <option value={2}>2-hop</option>
            <option value={3}>3-hop</option>
          </select>
          <label htmlFor="neighborhood-direction-select" className="sr-only">
            Neighborhood Direction
          </label>
          <select
            id="neighborhood-direction-select"
            value={direction}
            onChange={(e) =>
              onDirectionChange(
                e.target.value as "incoming" | "outgoing" | "both",
              )
            }
            className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="both">Both Directions</option>
            <option value="incoming">Incoming Only</option>
            <option value="outgoing">Outgoing Only</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-zinc-700 uppercase dark:text-zinc-300">
            Incoming Dependencies ({incomingEdges.length})
          </span>
          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {incomingEdges.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onSelectNode(e.sourceId)}
                className="flex items-center justify-between rounded-md bg-zinc-50 px-2.5 py-1.5 text-left font-mono text-xs text-zinc-800 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
              >
                <span className="truncate">
                  {e.sourceId.replace("node:file:", "")}
                </span>
                <span className="text-2xs text-zinc-400">×{e.weight}</span>
              </button>
            ))}
            {incomingEdges.length === 0 && (
              <p className="text-2xs text-zinc-500 italic">
                No incoming modules.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-zinc-700 uppercase dark:text-zinc-300">
            Outgoing Dependencies ({outgoingEdges.length})
          </span>
          <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
            {outgoingEdges.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onSelectNode(e.targetId)}
                className="flex items-center justify-between rounded-md bg-zinc-50 px-2.5 py-1.5 text-left font-mono text-xs text-zinc-800 hover:bg-indigo-50 hover:text-indigo-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
              >
                <span className="truncate">
                  {e.targetId
                    .replace("node:file:", "")
                    .replace("node:ext:", "ext:")}
                </span>
                <span className="text-2xs text-zinc-400">×{e.weight}</span>
              </button>
            ))}
            {outgoingEdges.length === 0 && (
              <p className="text-2xs text-zinc-500 italic">
                No outgoing modules.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
