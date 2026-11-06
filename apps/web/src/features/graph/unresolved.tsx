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
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-zinc-800 bg-[#111216] p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
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
            className="rounded-lg border border-dotted border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-100 placeholder-zinc-500 focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="border-b border-dotted border-zinc-800 bg-zinc-900/60 font-mono text-xs font-semibold text-zinc-400 uppercase">
            <tr>
              <th className="px-3 py-2.5">Source File</th>
              <th className="px-3 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Target Specifier</th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-zinc-800">
            {filtered.map((ref) => (
              <tr key={ref.id} className="hover:bg-zinc-900/40">
                <td className="px-3 py-2 font-mono text-zinc-200">
                  {ref.sourceFile}
                </td>
                <td className="px-3 py-2 font-mono font-medium text-zinc-300">
                  {ref.sourceSymbolName}
                </td>
                <td className="px-3 py-2 font-mono text-zinc-400">
                  {ref.moduleSpecifier}
                </td>
                <td className="px-3 py-2 font-mono text-zinc-500">
                  {ref.evidence.path}:{ref.evidence.startLine}-
                  {ref.evidence.endLine}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-zinc-400 uppercase">
                  {ref.status}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-zinc-500">
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
