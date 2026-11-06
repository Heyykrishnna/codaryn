"use client";
import React, { useState, useMemo, useDeferredValue } from "react";
import type { DependencyEdge, DependencyNode } from "@codaryn/contracts";

export function DependencyGraphView({
  nodes,
  edges,
  selectedNodeId,
  onSelectNode,
  onSelectEdge,
}: Readonly<{
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  onSelectEdge?: (edge: DependencyEdge) => void;
}>) {
  const [filter, setFilter] = useState("");
  const [resolutionFilter, setResolutionFilter] = useState("all");

  const deferredFilter = useDeferredValue(filter);
  const filteredNodes = useMemo(
    () =>
      nodes
        .filter(
          (n) =>
            n.path.toLowerCase().includes(deferredFilter.toLowerCase()) ||
            n.name.toLowerCase().includes(deferredFilter.toLowerCase()),
        )
        .slice(0, 200),
    [nodes, deferredFilter],
  );
  const filteredEdges = useMemo(() => {
    const visible = new Set(filteredNodes.map((n) => n.id));
    return edges
      .filter(
        (e) =>
          visible.has(e.sourceId) &&
          visible.has(e.targetId) &&
          (resolutionFilter === "all" || e.resolution === resolutionFilter),
      )
      .slice(0, 400);
  }, [edges, filteredNodes, resolutionFilter]);

  const width = 800;
  const height = 480;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 80;

  const nodePositions = new Map<string, { x: number; y: number }>();
  filteredNodes.forEach((node, index) => {
    const angle = (2 * Math.PI * index) / (filteredNodes.length || 1);
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    nodePositions.set(node.id, { x, y });
  });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
            Interactive Dependency Graph
          </h3>
          <p className="text-2xs text-zinc-500">
            Showing {filteredNodes.length} nodes and {filteredEdges.length}{" "}
            edges
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="graph-search-input" className="sr-only">
            Filter graph nodes
          </label>
          <input
            id="graph-search-input"
            type="search"
            placeholder="Search nodes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <label htmlFor="graph-resolution-filter" className="sr-only">
            Filter by resolution
          </label>
          <select
            id="graph-resolution-filter"
            value={resolutionFilter}
            onChange={(e) => setResolutionFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="all">All Resolutions</option>
            <option value="RESOLVED">Resolved Only</option>
            <option value="DIRECT">Direct Only</option>
            <option value="UNRESOLVED">Unresolved Only</option>
          </select>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/40">
        <svg
          role="group"
          aria-label="Dependency graph, select nodes or relationships with Enter"
          viewBox={`0 0 ${width} ${height}`}
          className="h-[480px] w-full select-none"
        >
          <defs>
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#818cf8" />
            </marker>
            <marker
              id="arrow-selected"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#4f46e5" />
            </marker>
          </defs>

          {filteredEdges.map((edge) => {
            const start = nodePositions.get(edge.sourceId);
            const end = nodePositions.get(edge.targetId);
            if (!start || !end) return null;

            const isConnected =
              selectedNodeId &&
              (edge.sourceId === selectedNodeId ||
                edge.targetId === selectedNodeId);

            return (
              <line
                key={edge.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={isConnected ? "#a1a1aa" : "#3f3f46"}
                strokeWidth={isConnected ? 2.5 : 1.2}
                strokeDasharray={
                  edge.resolution === "UNRESOLVED" ? "4 4" : undefined
                }
                markerEnd={isConnected ? "url(#arrow-selected)" : "url(#arrow)"}
                className="cursor-pointer transition-all hover:stroke-zinc-300 focus-visible:stroke-amber-500 focus-visible:stroke-3 focus-visible:outline-none"
                role="button"
                tabIndex={0}
                aria-label={`Inspect relationship ${edge.sourceId} to ${edge.targetId}`}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectEdge?.(edge);
                  }
                }}
                onClick={() => onSelectEdge?.(edge)}
              />
            );
          })}

          {filteredNodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const isSelected = selectedNodeId === node.id;
            const isExternal = node.kind === "external";

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x},${pos.y})`}
                className="cursor-pointer focus:stroke-amber-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-500"
                role="button"
                tabIndex={0}
                aria-label={`Select ${node.path}`}
                aria-pressed={isSelected}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectNode?.(node.id);
                  }
                }}
                onClick={() => onSelectNode?.(node.id)}
              >
                <circle
                  r={isSelected ? 16 : isExternal ? 10 : 13}
                  className={`transition-all ${
                    isSelected
                      ? "fill-zinc-200 stroke-zinc-500 stroke-4 dark:stroke-zinc-400"
                      : isExternal
                        ? "fill-zinc-500 hover:fill-zinc-400"
                        : "fill-zinc-400 hover:fill-zinc-300"
                  }`}
                />
                <text
                  dy={isSelected ? 26 : 22}
                  textAnchor="middle"
                  className={`text-2xs font-mono font-semibold ${
                    isSelected
                      ? "fill-zinc-100 font-bold dark:fill-white"
                      : "fill-zinc-700 dark:fill-zinc-300"
                  }`}
                >
                  {node.name.length > 14
                    ? `${node.name.slice(0, 12)}…`
                    : node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {filteredNodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500 italic">
            No graph nodes match current filters.
          </div>
        )}
      </div>
    </div>
  );
}
