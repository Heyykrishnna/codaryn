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
  const totalFiles = inventory?.summary.totalFiles ?? job.fileCount;
  const analyzedFiles = inventory?.files.length ?? job.fileCount;
  const parseErrors = diagnostics?.errorCount ?? job.diagnosticCount;
  const totalSymbols = symbols?.totalCount ?? job.symbolCount;

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
      <div className="rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-600 uppercase">
            Analysis Coverage
          </span>
          <span className="text-xs font-semibold text-neutral-800">
            {successRate}% Healthy
          </span>
        </div>
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full bg-neutral-800 transition-all duration-300"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-neutral-600">
          {analyzedFiles - parseErrors} of {totalFiles} files parsed without
          errors
        </p>
      </div>

      <div className="rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
        <span className="text-xs font-medium text-neutral-600 uppercase">
          Files Analyzed
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-900">
            {analyzedFiles}
          </span>
          <span className="text-xs text-neutral-600">/ {totalFiles} total</span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Discovered across repository projects
        </p>
      </div>

      <div className="rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
        <span className="text-xs font-medium text-neutral-600 uppercase">
          Symbols Extracted
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-neutral-800">
            {totalSymbols.toLocaleString()}
          </span>
          <span className="text-xs text-neutral-600">symbols</span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Functions, classes, types, &amp; modules
        </p>
      </div>

      <div className="rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
        <span className="text-xs font-medium text-neutral-600 uppercase">
          Diagnostics &amp; Errors
        </span>
        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl font-bold ${
              parseErrors > 0 ? "text-neutral-800" : "text-neutral-900"
            }`}
          >
            {parseErrors}
          </span>
          <span className="text-xs text-neutral-600">syntax errors</span>
        </div>
        <p className="mt-1 text-xs text-neutral-600">
          Partial failure resilience enabled
        </p>
      </div>
    </div>
  );
}
