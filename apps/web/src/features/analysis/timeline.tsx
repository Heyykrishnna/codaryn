"use client";
import React from "react";
import type { StageProgress } from "@codaryn/contracts";

export function AnalysisTimeline({
  stages,
  currentStage,
}: Readonly<{
  stages: StageProgress[];
  currentStage: string;
}>) {
  const getBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300";
      case "running":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-400 animate-pulse";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300";
      case "skipped":
        return "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300";
      default:
        return "bg-zinc-50 text-zinc-400 dark:bg-zinc-900 dark:text-zinc-600 border-zinc-200";
    }
  };

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
        Stage Execution Timeline
      </h3>
      <ol className="relative ml-3 border-l border-zinc-200 dark:border-zinc-700">
        {stages.map((stage) => {
          const isCurrent = stage.stage === currentStage;
          return (
            <li key={stage.stage} className="mb-6 ml-6 last:mb-0">
              <span
                className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${getBadgeClass(
                  stage.status,
                )}`}
              >
                {stage.status === "completed" ? "✓" : isCurrent ? "▶" : "•"}
              </span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-zinc-900 capitalize dark:text-zinc-100">
                    {stage.stage}
                  </span>
                  <span
                    className={`rounded-sm px-2 py-0.5 text-xs font-medium uppercase ${getBadgeClass(
                      stage.status,
                    )}`}
                  >
                    {stage.status}
                  </span>
                  {stage.durationMs !== undefined && (
                    <span className="text-xs text-zinc-500">
                      {stage.durationMs}ms
                    </span>
                  )}
                </div>
                {stage.itemsTotal > 0 && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {stage.itemsCompleted} of {stage.itemsTotal} items processed
                  </p>
                )}
                {stage.message && (
                  <p className="text-xs text-zinc-500 italic dark:text-zinc-400">
                    {stage.message}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
