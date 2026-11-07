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
        return "bg-neutral-100 text-neutral-800   border-neutral-500";
      case "PARTIAL":
      case "INFERRED":
        return "bg-neutral-100 text-neutral-800   border-neutral-500";
      default:
        return "bg-neutral-100 text-neutral-800   border-neutral-500";
    }
  };

  return (
    <div className="rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-dotted border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-wider text-neutral-900 uppercase">
            Source Evidence Inspector
          </h3>
          <span
            className={`rounded-xs border px-2 py-0.5 text-xs font-bold uppercase ${getResolutionBadge(
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
            className="text-xs text-neutral-600 hover:text-neutral-900"
          >
            ✕ Close
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-neutral-600">Relationship Kind:</span>
          <span className="font-mono font-medium text-neutral-900 capitalize">
            {edge.kind}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-neutral-600">Weight (Reference Count):</span>
          <span className="font-mono font-medium text-neutral-900">
            {edge.weight}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-neutral-600">Source Node:</span>
          <span className="font-mono font-medium break-all text-neutral-800">
            {edge.sourceId}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-neutral-600">Target Node:</span>
          <span className="font-mono font-medium break-all text-neutral-800">
            {edge.targetId}
          </span>
        </div>

        <div className="mt-2 flex flex-col gap-2">
          <span className="font-semibold text-neutral-700">
            Navigable Evidence Ranges ({edge.evidence.length})
          </span>
          <div className="flex flex-col gap-1.5">
            {edge.evidence.map((ev: SourceEvidence, idx: number) => (
              <div
                key={`${ev.path}:${ev.startLine}-${ev.endLine}-${idx}`}
                className="flex items-center justify-between rounded-md bg-neutral-50 px-3 py-2 font-mono text-xs"
              >
                <span className="text-neutral-800">{ev.path}</span>
                <span className="text-neutral-600">
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
