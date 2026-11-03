"use client";
import React from "react";
import type { DependencyEdge, SourceEvidence } from "@codaryn/contracts";

export function SourceEvidenceInspector({
  edge,
  onClose,
}: Readonly<{
  edge: DependencyEdge | null;
  onClose?: () => void;
}>) {
  if (!edge) return null;

  const getResolutionBadge = (resolution: string) => {
    switch (resolution) {
      case "RESOLVED":
      case "DIRECT":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
      case "PARTIAL":
      case "INFERRED":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
      default:
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300";
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
            Source Evidence Inspector
          </h3>
          <span
            className={`text-2xs rounded-xs border px-2 py-0.5 font-bold uppercase ${getResolutionBadge(
              edge.resolution,
            )}`}
          >
            {edge.resolution}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ✕ Close
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Relationship Kind:</span>
          <span className="font-mono font-medium text-zinc-900 capitalize dark:text-zinc-100">
            {edge.kind}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Weight (Reference Count):</span>
          <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
            {edge.weight}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">Source Node:</span>
          <span className="font-mono font-medium break-all text-zinc-800 dark:text-zinc-200">
            {edge.sourceId}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500">Target Node:</span>
          <span className="font-mono font-medium break-all text-zinc-800 dark:text-zinc-200">
            {edge.targetId}
          </span>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            Navigable Evidence Ranges ({edge.evidence.length})
          </span>
          <div className="flex flex-col gap-1.5">
            {edge.evidence.map((ev: SourceEvidence, idx: number) => (
              <div
                key={`${ev.path}:${ev.startLine}-${ev.endLine}-${idx}`}
                className="text-2xs flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 font-mono dark:bg-zinc-800/60"
              >
                <span className="text-zinc-800 dark:text-zinc-200">
                  {ev.path}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  Lines {ev.startLine}–{ev.endLine}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
