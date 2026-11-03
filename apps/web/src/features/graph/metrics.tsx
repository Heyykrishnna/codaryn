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
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
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
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
        <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
          <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">Module Path</th>
              <th className="px-3 py-2.5">Afferent (Ca)</th>
              <th className="px-3 py-2.5">Efferent (Ce)</th>
              <th className="px-3 py-2.5">Instability (I)</th>
              <th className="px-3 py-2.5">Depth</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((m) => (
              <tr
                key={m.path}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-3 py-2 font-mono text-zinc-900 dark:text-zinc-100">
                  {m.path}
                </td>
                <td className="px-3 py-2 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {m.afferentCoupling}
                </td>
                <td className="px-3 py-2 font-mono font-medium text-indigo-600 dark:text-indigo-400">
                  {m.efferentCoupling}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                      <div
                        className={`h-full ${
                          m.instability > 0.7
                            ? "bg-red-500"
                            : m.instability > 0.3
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${Math.round(m.instability * 100)}%` }}
                      />
                    </div>
                    <span className="text-2xs font-mono text-zinc-700 dark:text-zinc-300">
                      {m.instability.toFixed(2)}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-zinc-700 dark:text-zinc-300">
                  {m.depth}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-zinc-500 italic"
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
