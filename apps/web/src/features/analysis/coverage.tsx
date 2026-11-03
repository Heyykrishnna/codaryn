"use client";
import React from "react";
import type {
  AnalysisJobSummary,
  FileInventoryResponse,
  SymbolInventoryResponse,
  DiagnosticsResponse,
} from "@codaryn/contracts";

export function AnalysisCoverageIndicators({
  job,
  inventory,
  symbols,
  diagnostics,
}: Readonly<{
  job: AnalysisJobSummary;
  inventory?: FileInventoryResponse | null;
  symbols?: SymbolInventoryResponse | null;
  diagnostics?: DiagnosticsResponse | null;
}>) {
  const totalFiles =
    inventory?.summary.totalFiles ?? job.metrics.filesDiscovered;
  const analyzedFiles = job.metrics.filesAnalyzed;
  const parseErrors =
    diagnostics?.diagnostics.filter((d) => d.severity === "error").length ??
    job.metrics.parseErrors;
  const totalSymbols = symbols?.totalSymbols ?? job.metrics.symbolsExtracted;

  const successRate =
    totalFiles > 0
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(((analyzedFiles - parseErrors) / totalFiles) * 100),
          ),
        )
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">
            Analysis Coverage
          </span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {successRate}% Healthy
          </span>
        </div>
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
        <p className="text-2xs mt-2 text-zinc-500">
          {analyzedFiles - parseErrors} of {totalFiles} files parsed without
          errors
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">
          Files Analyzed
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            {analyzedFiles}
          </span>
          <span className="text-xs text-zinc-500">/ {totalFiles} total</span>
        </div>
        <p className="text-2xs mt-1 text-zinc-500">
          Discovered across repository projects
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">
          Symbols Extracted
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {totalSymbols.toLocaleString()}
          </span>
          <span className="text-xs text-zinc-500">symbols</span>
        </div>
        <p className="text-2xs mt-1 text-zinc-500">
          Functions, classes, types, &amp; modules
        </p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs font-medium text-zinc-500 uppercase dark:text-zinc-400">
          Diagnostics &amp; Errors
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold ${
              parseErrors > 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            {parseErrors}
          </span>
          <span className="text-xs text-zinc-500">syntax errors</span>
        </div>
        <p className="text-2xs mt-1 text-zinc-500">
          Partial failure resilience enabled
        </p>
      </div>
    </div>
  );
}
