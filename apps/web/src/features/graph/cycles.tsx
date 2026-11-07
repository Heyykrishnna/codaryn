"use client";
import React from "react";
import type { DependencyCycle } from "@codaryn/contracts";

export function DependencyCyclesPanel({
  cycles,
  onSelectNode,
}: Readonly<{
  cycles: DependencyCycle[];
  onSelectNode?: (nodeId: string) => void;
}>) {
  if (cycles.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-500 bg-neutral-100/50 p-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-800">
            No cycles in the returned summary
          </span>
        </div>
        <p className="mt-1 text-xs text-neutral-800">
          This bounded static summary contains no detected cycles. It does not
          prove runtime behavior or absence of cycles outside the analyzed
          evidence.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-neutral-500 bg-neutral-100/30 p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-neutral-800 motion-safe:animate-pulse" />
          <h3 className="text-sm font-semibold tracking-wider text-neutral-800 uppercase">
            Circular Dependency Warnings ({cycles.length})
          </h3>
        </div>
        <span className="text-muted text-xs font-medium">
          {cycles.length} loop{cycles.length === 1 ? "" : "s"} detected
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {cycles.map((cycle, index) => (
          <div
            key={cycle.id}
            className="rounded-md border border-neutral-500 bg-white p-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900">
                Cycle #{index + 1} ({cycle.length} modules)
              </span>
              <span className="font-mono text-xs text-neutral-600">
                {cycle.id}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
              {cycle.path.map((segment, segIdx) => (
                <React.Fragment key={`${cycle.id}-${segIdx}-${segment}`}>
                  <button
                    type="button"
                    onClick={() => {
                      const id = cycle.nodeIds.find(
                        (item) =>
                          item === `node:file:${segment}` ||
                          item === `${cycle.jobId}:node:file:${segment}`,
                      );
                      if (id) onSelectNode?.(id);
                    }}
                    className="rounded-sm bg-neutral-100 px-2 py-1 text-neutral-800 hover:bg-neutral-100 hover:text-neutral-950"
                  >
                    {segment}
                  </button>
                  {segIdx < cycle.path.length - 1 && (
                    <span className="font-bold text-neutral-600">→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
