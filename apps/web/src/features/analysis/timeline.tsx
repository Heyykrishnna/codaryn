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
        return "bg-neutral-100 text-neutral-800   border-neutral-500";
      case "running":
        return "bg-neutral-100 text-neutral-800   border-neutral-500 motion-safe:animate-pulse";
      case "failed":
        return "bg-neutral-100 text-neutral-800   border-neutral-500";
      case "skipped":
        return "bg-neutral-100 text-neutral-600   border-neutral-300";
      default:
        return "bg-neutral-50 text-neutral-600   border-neutral-200";
    }
  };

  return (
    <div className="rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
      <h3 className="mb-4 text-sm font-semibold tracking-wider text-neutral-900 uppercase">
        Stage Execution Timeline
      </h3>
      <ol className="relative ml-3 border-l border-dotted border-neutral-200">
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
                  <span className="font-medium text-neutral-900 capitalize">
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
                    <span className="text-xs text-neutral-600">
                      {stage.durationMs}ms
                    </span>
                  )}
                </div>
                {stage.itemsTotal > 0 && (
                  <p className="text-xs text-neutral-600">
                    {stage.itemsCompleted} of {stage.itemsTotal} items processed
                  </p>
                )}
                {stage.message && (
                  <p className="text-xs text-neutral-600 italic">
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
