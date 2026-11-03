"use client";
import React, { useState } from "react";
import type { AstDiagnostic } from "@codaryn/contracts";

export function DiagnosticsPanel({
  diagnostics,
}: Readonly<{
  diagnostics: AstDiagnostic[];
}>) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter(
    (d) => d.severity === "warning",
  ).length;
  const infoCount = diagnostics.filter((d) => d.severity === "info").length;

  const filtered = diagnostics.filter((d) => {
    const matchesSeverity =
      severityFilter === "all" || d.severity === severityFilter;
    const matchesSearch =
      d.message.toLowerCase().includes(search.toLowerCase()) ||
      d.path.toLowerCase().includes(search.toLowerCase()) ||
      String(d.code).includes(search);
    return matchesSeverity && matchesSearch;
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300";
      case "warning":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300";
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
            Diagnostics &amp; Parse Errors
          </h3>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {diagnostics.length}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="diag-search-input" className="sr-only">
            Search diagnostics
          </label>
          <input
            id="diag-search-input"
            type="search"
            placeholder="Search diagnostics..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <label htmlFor="diag-severity-select" className="sr-only">
            Filter by severity
          </label>
          <select
            id="diag-severity-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="all">All Severities ({diagnostics.length})</option>
            <option value="error">Errors ({errorCount})</option>
            <option value="warning">Warnings ({warningCount})</option>
            <option value="info">Info ({infoCount})</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
          <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">Severity</th>
              <th className="px-3 py-2.5">Code</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((diag) => (
              <tr
                key={diag.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-3 py-2">
                  <span
                    className={`text-2xs inline-block rounded-xs border px-1.5 py-0.5 font-bold uppercase ${getSeverityBadge(
                      diag.severity,
                    )}`}
                  >
                    {diag.severity}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                  TS{diag.code}
                </td>
                <td className="text-2xs px-3 py-2 font-mono text-zinc-500">
                  {diag.location.path}:{diag.location.startLine}:
                  {diag.location.startColumn}
                </td>
                <td className="px-3 py-2 font-mono text-zinc-900 dark:text-zinc-100">
                  {diag.message}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-zinc-500 italic"
                >
                  {diagnostics.length === 0
                    ? "No syntax errors or diagnostics detected. All files parsed cleanly."
                    : "No diagnostics matched the current filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
