"use client";

import { useEffect, useState, useTransition } from "react";
import type {
  DiagramEdge,
  DiagramGraph,
  DiagramLayoutConfig,
  DiagramNode,
  DiagramType,
  ExportFormat,
  SavedDiagramLayout,
} from "@codaryn/contracts";
import {
  fetchDiagramGraph,
  fetchDiagramLayouts,
  saveDiagramLayout,
  requestExport,
  checkExportStatus,
} from "./api";

const diagramTypes: Array<{ id: DiagramType; label: string }> = [
  { id: "system", label: "System Architecture" },
  { id: "frontend", label: "Frontend Architecture" },
  { id: "backend", label: "Backend Architecture" },
  { id: "api", label: "API Explorer" },
  { id: "erd", label: "Database ERD" },
  { id: "dependencies", label: "Module Dependencies" },
  { id: "execution", label: "Execution & Call Graph" },
  { id: "infrastructure", label: "Infrastructure" },
];

interface DiagramViewState {
  key: string;
  graph: DiagramGraph | null;
  savedLayouts: SavedDiagramLayout[];
  error: string | null;
}

export function DiagramWorkspace({
  workspaceId,
  jobId,
}: {
  workspaceId: string;
  jobId: string;
}) {
  const [selectedType, setSelectedType] = useState<DiagramType>("system");
  const [, startTransition] = useTransition();

  const requestKey = `${workspaceId}:${jobId}:${selectedType}`;
  const [viewState, setViewState] = useState<DiagramViewState>({
    key: "",
    graph: null,
    savedLayouts: [],
    error: null,
  });

  const loading = viewState.key !== requestKey && !viewState.error;
  const graph = viewState.key === requestKey ? viewState.graph : null;
  const savedLayouts =
    viewState.key === requestKey ? viewState.savedLayouts : [];
  const error = viewState.key === requestKey ? viewState.error : null;

  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [nodePositions, setNodePositions] = useState<
    Record<string, { x: number; y: number }>
  >({});

  const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [layoutName, setLayoutName] = useState<string>("");

  const [selectedNode, setSelectedNode] = useState<DiagramNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<DiagramEdge | null>(null);

  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("svg");
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    Promise.all([
      fetchDiagramGraph(workspaceId, jobId, selectedType),
      fetchDiagramLayouts(workspaceId, jobId, selectedType),
    ])
      .then(([loadedGraph, layouts]) => {
        if (!active) return;

        const initialPos: Record<string, { x: number; y: number }> = {};
        const cols = Math.max(
          1,
          Math.ceil(Math.sqrt(loadedGraph.nodes.length)),
        );
        for (let i = 0; i < loadedGraph.nodes.length; i++) {
          const node = loadedGraph.nodes[i];
          if (node) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            initialPos[node.id] = {
              x: 50 + col * 260,
              y: 50 + row * 160,
            };
          }
        }
        setNodePositions(initialPos);

        setViewState({
          key: requestKey,
          graph: loadedGraph,
          savedLayouts: layouts,
          error: null,
        });
      })
      .catch((err: unknown) => {
        if (!active) return;
        setViewState({
          key: requestKey,
          graph: null,
          savedLayouts: [],
          error: err instanceof Error ? err.message : "Failed to load diagram",
        });
      });

    return () => {
      active = false;
    };
  }, [workspaceId, jobId, selectedType, requestKey]);

  const handleApplyLayout = (layoutId: string) => {
    setSelectedLayoutId(layoutId);
    const found = savedLayouts.find((l) => l.id === layoutId);
    if (found?.layoutConfig) {
      setZoom(found.layoutConfig.zoom);
      setPan(found.layoutConfig.pan);
      setNodePositions(found.layoutConfig.positions);
    }
  };

  const handleSaveLayout = async () => {
    if (!layoutName.trim()) return;
    const config: DiagramLayoutConfig = {
      zoom,
      pan,
      positions: nodePositions,
      collapsedGroups: [],
      engine: "dagre",
    };
    try {
      const saved = await saveDiagramLayout(
        workspaceId,
        jobId,
        selectedType,
        layoutName.trim(),
        config,
      );
      setViewState((prev) => ({
        ...prev,
        savedLayouts: [saved, ...prev.savedLayouts],
      }));
      setSelectedLayoutId(saved.id);
      setShowSaveModal(false);
      setLayoutName("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save layout");
    }
  };

  const handleStartExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const job = await requestExport(workspaceId, jobId, {
        jobId,
        exportType: "diagram",
        format: exportFormat,
        targetId: selectedType,
      });

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

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="flex h-full flex-col bg-neutral-50 text-neutral-900">
      <header className="flex flex-wrap items-center justify-between border-b border-dotted border-neutral-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {diagramTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                setSelectedNode(null);
                setSelectedEdge(null);
                startTransition(() => {
                  setSelectedType(type.id);
                });
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedType === type.id
                  ? "bg-neutral-800 text-neutral-950"
                  : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-dotted border-neutral-200 bg-neutral-50 p-1">
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}
              className="rounded px-2.5 py-1 text-sm font-bold text-neutral-700 hover:bg-neutral-200"
            >
              -
            </button>
            <span className="px-2 text-xs font-semibold text-neutral-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
              className="rounded px-2.5 py-1 text-sm font-bold text-neutral-700 hover:bg-neutral-200"
            >
              +
            </button>
            <button
              type="button"
              aria-label="Reset view"
              onClick={resetView}
              className="ml-1 rounded px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-200"
            >
              Reset
            </button>
          </div>

          {savedLayouts.length > 0 && (
            <select
              aria-label="Saved layouts"
              value={selectedLayoutId}
              onChange={(e) => handleApplyLayout(e.target.value)}
              className="rounded-lg border border-dotted border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700"
            >
              <option value="">Load saved layout...</option>
              {savedLayouts.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Save Layout
          </button>

          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-neutral-800"
          >
            Export
          </button>
        </div>
      </header>

      {error && (
        <div className="m-4 rounded-lg border border-neutral-500 bg-neutral-100 p-4 text-sm text-neutral-800">
          <p className="font-semibold">Error loading diagram</p>
          <p>{error}</p>
        </div>
      )}

      {loading && !error && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-neutral-600">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-4 border-neutral-500 border-t-transparent" />
            <p className="text-sm font-medium">
              Rendering architecture graph...
            </p>
          </div>
        </div>
      )}

      {!loading && !error && graph && (
        <div className="relative flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-auto bg-neutral-50 p-8">
            <svg
              className="min-h-full min-w-full"
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transformOrigin: "0 0",
              }}
              width="2400"
              height="1600"
            >
              <defs>
                <marker
                  id="arrow-head"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#737373" />
                </marker>
              </defs>

              {graph.edges.map((edge) => {
                const srcPos = nodePositions[edge.source];
                const tgtPos = nodePositions[edge.target];
                if (!srcPos || !tgtPos) return null;

                const x1 = srcPos.x + 110;
                const y1 = srcPos.y + 35;
                const x2 = tgtPos.x + 110;
                const y2 = tgtPos.y + 35;

                const strokeColor =
                  edge.status === "DIRECT"
                    ? "#404040"
                    : edge.status === "RESOLVED"
                      ? "#525252"
                      : edge.status === "INFERRED"
                        ? "#737373"
                        : "#262626";

                const isSelected = selectedEdge?.id === edge.id;

                return (
                  <g
                    key={edge.id}
                    onClick={() => {
                      setSelectedEdge(edge);
                      setSelectedNode(null);
                    }}
                    className="cursor-pointer"
                  >
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={
                        edge.status === "INFERRED" ? "4,4" : undefined
                      }
                      markerEnd="url(#arrow-head)"
                    />
                    {edge.label && (
                      <text
                        x={(x1 + x2) / 2}
                        y={(y1 + y2) / 2 - 6}
                        fill="#525252"
                        fontSize="11"
                        textAnchor="middle"
                        className="bg-white font-sans select-none"
                      >
                        {edge.label} [{edge.status}]
                      </text>
                    )}
                  </g>
                );
              })}

              {graph.nodes.map((node) => {
                const pos = nodePositions[node.id] || { x: 50, y: 50 };
                const isSelected = selectedNode?.id === node.id;

                const fillBg =
                  node.status === "DIRECT"
                    ? "#fafafa"
                    : node.status === "RESOLVED"
                      ? "#f5f5f5"
                      : node.status === "INFERRED"
                        ? "#e5e5e5"
                        : "#d4d4d4";

                const strokeColor =
                  node.status === "DIRECT"
                    ? "#404040"
                    : node.status === "RESOLVED"
                      ? "#525252"
                      : node.status === "INFERRED"
                        ? "#737373"
                        : "#262626";

                return (
                  <g
                    key={node.id}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => {
                      setSelectedNode(node);
                      setSelectedEdge(null);
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      width="220"
                      height="70"
                      rx="8"
                      fill={fillBg}
                      stroke={isSelected ? "#171717" : strokeColor}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all hover:brightness-95"
                    />
                    <text
                      x="12"
                      y="26"
                      fontSize="13"
                      fontWeight="bold"
                      fill="#171717"
                      className="font-sans select-none"
                    >
                      {node.label.length > 24
                        ? `${node.label.slice(0, 22)}...`
                        : node.label}
                    </text>
                    <text
                      x="12"
                      y="46"
                      fontSize="11"
                      fill="#525252"
                      className="font-sans select-none"
                    >
                      {node.kind} · {node.status}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {(selectedNode || selectedEdge) && (
            <aside className="w-80 border-l border-dotted border-neutral-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-dotted border-neutral-200 pb-3">
                <h3 className="text-base font-semibold text-neutral-900">
                  Source Evidence & Details
                </h3>
                <button
                  type="button"
                  aria-label="Close details"
                  onClick={() => {
                    setSelectedNode(null);
                    setSelectedEdge(null);
                  }}
                  className="rounded p-1 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-600"
                >
                  ✕
                </button>
              </div>

              {selectedNode && (
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-neutral-600 uppercase">
                      Label
                    </span>
                    <p className="font-medium text-neutral-900">
                      {selectedNode.label}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-600 uppercase">
                      Kind & Group
                    </span>
                    <p className="text-neutral-700">
                      {selectedNode.kind}{" "}
                      {selectedNode.group ? `(${selectedNode.group})` : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-600 uppercase">
                      Resolution Confidence
                    </span>
                    <p className="inline-block rounded px-2 py-0.5 text-xs font-bold uppercase">
                      {selectedNode.status}
                    </p>
                  </div>
                  {selectedNode.evidence ? (
                    <div>
                      <span className="text-xs font-semibold text-neutral-600 uppercase">
                        Source Evidence
                      </span>
                      <p className="font-mono text-xs text-neutral-800">
                        {selectedNode.evidence.path}:
                        {selectedNode.evidence.startLine}-
                        {selectedNode.evidence.endLine}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-800">
                      No explicit AST evidence attached. Relationship inferred.
                    </p>
                  )}
                </div>
              )}

              {selectedEdge && (
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <span className="text-xs font-semibold text-neutral-600 uppercase">
                      Relationship
                    </span>
                    <p className="font-medium text-neutral-900">
                      {selectedEdge.source} → {selectedEdge.target}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-600 uppercase">
                      Kind
                    </span>
                    <p className="text-neutral-700">{selectedEdge.kind}</p>
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-neutral-600 uppercase">
                      Status
                    </span>
                    <p className="text-xs font-bold uppercase">
                      {selectedEdge.status}
                    </p>
                  </div>
                  {selectedEdge.evidence && (
                    <div>
                      <span className="text-xs font-semibold text-neutral-600 uppercase">
                        Evidence
                      </span>
                      <p className="font-mono text-xs text-neutral-800">
                        {selectedEdge.evidence.path}:
                        {selectedEdge.evidence.startLine}-
                        {selectedEdge.evidence.endLine}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </aside>
          )}

          <footer className="absolute bottom-4 left-4 flex flex-wrap gap-4 rounded-lg border border-dotted border-neutral-200 bg-white/95 px-4 py-2.5 shadow-md backdrop-blur">
            <span className="text-xs font-bold text-neutral-600 uppercase">
              Legend:
            </span>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rounded-full bg-neutral-800" />
              <span>Direct / Confirmed</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rounded-full bg-neutral-800" />
              <span>Resolved</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rounded-full bg-neutral-800" />
              <span>Inferred</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-3 w-3 rounded-full bg-neutral-800" />
              <span>Unresolved</span>
            </div>
          </footer>
        </div>
      )}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-96 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900">
              Save Diagram Layout
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Persist custom positions and zoom for this analysis view.
            </p>
            <input
              type="text"
              aria-label="Layout name"
              placeholder="e.g. Overview Layout"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="mt-4 w-full rounded-lg border border-dotted border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLayout}
                className="rounded-lg bg-neutral-800 px-4 py-1.5 text-sm font-medium text-neutral-950 hover:bg-neutral-800"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-96 rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-base font-semibold text-neutral-900">
              Export Diagram
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              Select export format for {selectedType} diagram.
            </p>
            <div className="mt-4 space-y-2">
              {(["svg", "mermaid", "json", "dbml"] as const).map((fmt) => (
                <label
                  key={fmt}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-dotted border-neutral-200 p-3 hover:bg-neutral-50"
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={fmt}
                    checked={exportFormat === fmt}
                    onChange={() => setExportFormat(fmt)}
                    className="accent-neutral-500"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900 uppercase">
                      {fmt}
                    </p>
                    <p className="text-xs text-neutral-600">
                      {fmt === "svg"
                        ? "Vector graphic representation"
                        : fmt === "mermaid"
                          ? "Editable diagram source code"
                          : fmt === "dbml"
                            ? "Database Markup Language"
                            : "Structured JSON data"}
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
                onClick={handleStartExport}
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
