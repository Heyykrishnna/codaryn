"use client";
import React, { useState } from "react";
import type { ModuleCouplingMetric } from "@codaryn/contracts";

export function ModuleMetricsPanel({
  metrics,
}: Readonly<{
  metrics: ModuleCouplingMetric[];
}>) {
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<
    "path" | "instability" | "depth" | "afferent"
  >("path");

  const filtered = metrics
    .filter((m) => m.path.toLowerCase().includes(filter.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case "instability":
          return b.instability - a.instability;
        case "depth":
          return b.depth - a.depth;
        case "afferent":
          return b.afferentCoupling - a.afferentCoupling;
        default:
          return a.path.localeCompare(b.path);
      }
    });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-neutral-900 uppercase">
          Module Coupling &amp; Instability Metrics ({metrics.length})
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="metrics-search" className="sr-only">
            Search module metrics
          </label>
          <input
            id="metrics-search"
            type="search"
            placeholder="Search module path..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-dotted border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-hidden"
          />
          <label htmlFor="metrics-sort" className="sr-only">
            Sort metrics
          </label>
          <select
            id="metrics-sort"
            value={sortBy}
            onChange={(e) =>
              setSortBy(
                e.target.value as "path" | "instability" | "depth" | "afferent",
              )
            }
            className="rounded-md border border-dotted border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-hidden"
          >
            <option value="path">Sort by Path</option>
            <option value="instability">Sort by Instability (Highest)</option>
            <option value="depth">Sort by Depth (Deepest)</option>
            <option value="afferent">
              Sort by Afferent Coupling (Most Used)
            </option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-neutral-600">
          <thead className="border-b border-dotted border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase">
            <tr>
              <th className="px-3 py-2.5">Module Path</th>
              <th className="px-3 py-2.5">Afferent (Ca)</th>
              <th className="px-3 py-2.5">Efferent (Ce)</th>
              <th className="px-3 py-2.5">Instability (I)</th>
              <th className="px-3 py-2.5">Depth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-neutral-200">
            {filtered.map((m) => (
              <tr key={m.path} className="hover:bg-neutral-50">
                <td className="px-3 py-2 font-mono text-neutral-900">
                  {m.path}
                </td>
                <td className="px-3 py-2 font-mono font-medium text-neutral-800">
                  {m.afferentCoupling}
                </td>
                <td className="px-3 py-2 font-mono font-medium text-neutral-600">
                  {m.efferentCoupling}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200">
                      <div
                        className={`h-full ${
                          m.instability > 0.7
                            ? "bg-neutral-800"
                            : m.instability > 0.3
                              ? "bg-neutral-800"
                              : "bg-neutral-800"
                        }`}
                        style={{ width: `${Math.round(m.instability * 100)}%` }}
                      />
                    </div>
                    <span className="font-mono text-xs text-neutral-700">
                      {m.instability.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-neutral-700">
                  {m.depth}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-neutral-600 italic"
                >
                  No module metrics matched the filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
