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
        return "bg-neutral-100 text-neutral-800   border-neutral-500";
      case "warning":
        return "bg-neutral-100 text-neutral-800   border-neutral-500";
      default:
        return "bg-neutral-100 text-neutral-800   border-neutral-500";
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold tracking-wider text-neutral-900 uppercase">
            Diagnostics &amp; Parse Errors
          </h3>
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
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
            className="rounded-md border border-dotted border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-hidden"
          />
          <label htmlFor="diag-severity-select" className="sr-only">
            Filter by severity
          </label>
          <select
            id="diag-severity-select"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-dotted border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-hidden"
          >
            <option value="all">All Severities ({diagnostics.length})</option>
            <option value="error">Errors ({errorCount})</option>
            <option value="warning">Warnings ({warningCount})</option>
            <option value="info">Info ({infoCount})</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-neutral-600">
          <thead className="border-b border-dotted border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase">
            <tr>
              <th className="px-3 py-2.5">Severity</th>
              <th className="px-3 py-2.5">Code</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-neutral-200">
            {filtered.map((diag) => (
              <tr key={diag.id} className="hover:bg-neutral-50">
                <td className="px-3 py-2">
                  <span
                    className={`inline-block rounded-xs border px-1.5 py-0.5 text-xs font-bold uppercase ${getSeverityBadge(
                      diag.severity,
                    )}`}
                  >
                    {diag.severity}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-neutral-700">
                  TS{diag.code}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                  {diag.location
                    ? `${diag.location.path}:${diag.location.startLine}:${diag.location.startColumn}`
                    : diag.path}
                </td>
                <td className="px-3 py-2 font-mono text-neutral-900">
                  {diag.message}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="py-8 text-center text-neutral-600 italic"
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
