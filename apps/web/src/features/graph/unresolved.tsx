"use client";
import React, { useState } from "react";
import type { ResolvedSymbolReference } from "@codaryn/contracts";

export function UnresolvedReferencesPanel({
  references,
}: Readonly<{
  references: ResolvedSymbolReference[];
}>) {
  const [filter, setFilter] = useState("");

  const filtered = references.filter(
    (r) =>
      r.sourceFile.toLowerCase().includes(filter.toLowerCase()) ||
      r.sourceSymbolName.toLowerCase().includes(filter.toLowerCase()) ||
      r.moduleSpecifier.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
            Unresolved Dependencies ({references.length})
          </h3>
        </div>
        <div>
          <label htmlFor="unresolved-search" className="sr-only">
            Search unresolved references
          </label>
          <input
            id="unresolved-search"
            type="search"
            placeholder="Search missing references..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
          <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">Source File</th>
              <th className="px-3 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Target Specifier</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((ref) => (
              <tr
                key={ref.id}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-3 py-2 font-mono text-zinc-900 dark:text-zinc-100">
                  {ref.sourceFile}
                </td>
                <td className="px-3 py-2 font-mono font-medium text-amber-600 dark:text-amber-400">
                  {ref.sourceSymbolName}
                </td>
                <td className="px-3 py-2 font-mono text-zinc-500">
                  {ref.moduleSpecifier}
                </td>
                <td className="text-2xs px-3 py-2 font-mono text-zinc-500">
                  {ref.evidence.path}:{ref.evidence.startLine}-
                  {ref.evidence.endLine}
                </td>
                <td className="px-3 py-2">
                  <span className="text-2xs rounded-xs border border-amber-300 bg-amber-50 px-2 py-0.5 font-bold text-amber-800 uppercase dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {ref.status}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-zinc-500 italic"
                >
                  {references.length === 0
                    ? "All imported symbols and modules resolved successfully without broken references."
                    : "No unresolved references match the search filter."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
