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
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            ✓ No Circular Dependencies Detected
          </span>
        </div>
        <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
          The repository dependency graph is strictly acyclic across all
          analyzed modules.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-amber-300 bg-amber-50/30 p-5 shadow-xs dark:border-amber-800 dark:bg-amber-950/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
          <h3 className="text-sm font-semibold tracking-wider text-amber-900 uppercase dark:text-amber-200">
            Circular Dependency Warnings ({cycles.length})
          </h3>
        </div>
        <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
          {cycles.length} loop{cycles.length === 1 ? "" : "s"} detected
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {cycles.map((cycle, index) => (
          <div
            key={cycle.id}
            className="rounded-md border border-amber-200 bg-white p-4 shadow-2xs dark:border-amber-900/60 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Cycle #{index + 1} ({cycle.length} modules)
              </span>
              <span className="text-2xs font-mono text-zinc-500">
                {cycle.id}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs">
              {cycle.path.map((segment, segIdx) => (
                <React.Fragment key={`${cycle.id}-${segIdx}-${segment}`}>
                  <button
                    type="button"
                    onClick={() => onSelectNode?.(`node:file:${segment}`)}
                    className="rounded-sm bg-zinc-100 px-2 py-1 text-zinc-800 hover:bg-indigo-100 hover:text-indigo-800 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-indigo-950 dark:hover:text-indigo-300"
                  >
                    {segment}
                  </button>
                  {segIdx < cycle.path.length - 1 && (
                    <span className="font-bold text-zinc-400">→</span>
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
