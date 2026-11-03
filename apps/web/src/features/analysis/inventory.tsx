"use client";
import React, { useState } from "react";
import type {
  FileInventoryResponse,
  SourceFileClassification,
} from "@codaryn/contracts";

export function FileTypeSummary({
  summary,
}: Readonly<{
  summary: FileInventoryResponse["summary"];
}>) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Total Files
        </span>
        <span className="mt-1 block text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {summary.totalFiles}
        </span>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Total Lines of Code
        </span>
        <span className="mt-1 block text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          {summary.totalLines.toLocaleString()}
        </span>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          TypeScript / TSX
        </span>
        <span className="mt-1 block text-2xl font-bold text-indigo-600 dark:text-indigo-400">
          {(summary.byLanguage["typescript"] ?? 0) +
            (summary.byLanguage["tsx"] ?? 0)}
        </span>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Source Files
        </span>
        <span className="mt-1 block text-2xl font-bold text-emerald-600 dark:text-emerald-400">
          {summary.byRole["source"] ?? 0}
        </span>
      </div>
    </div>
  );
}

export function FileExplorer({
  files,
}: Readonly<{
  files: SourceFileClassification[];
}>) {
  const [filter, setFilter] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");

  const filtered = files.filter((file) => {
    const matchesPath = file.path.toLowerCase().includes(filter.toLowerCase());
    const matchesLanguage =
      selectedLanguage === "all" || file.language === selectedLanguage;
    return matchesPath && matchesLanguage;
  });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
          Repository File Inventory
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="file-search-input" className="sr-only">
            Search files
          </label>
          <input
            id="file-search-input"
            type="search"
            placeholder="Search path..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <label htmlFor="language-select-input" className="sr-only">
            Filter by language
          </label>
          <select
            id="language-select-input"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="all">All Languages</option>
            <option value="typescript">TypeScript</option>
            <option value="tsx">TSX</option>
            <option value="javascript">JavaScript</option>
            <option value="jsx">JSX</option>
            <option value="json">JSON</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
          <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
            <tr>
              <th className="px-3 py-2.5">Path</th>
              <th className="px-3 py-2.5">Language</th>
              <th className="px-3 py-2.5">Role</th>
              <th className="px-3 py-2.5">Lines</th>
              <th className="px-3 py-2.5">Size</th>
              <th className="px-3 py-2.5">Frameworks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filtered.map((file) => (
              <tr
                key={file.path}
                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-3 py-2 font-mono text-zinc-900 dark:text-zinc-100">
                  {file.path}
                </td>
                <td className="px-3 py-2">
                  <span className="text-2xs rounded-sm bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {file.language}
                  </span>
                </td>
                <td className="px-3 py-2 capitalize">{file.role}</td>
                <td className="px-3 py-2 font-mono">{file.linesOfCode}</td>
                <td className="px-3 py-2 font-mono">
                  {(file.sizeBytes / 1024).toFixed(1)} KB
                </td>
                <td className="px-3 py-2">
                  {file.frameworks.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {file.frameworks.map((fw) => (
                        <span
                          key={fw}
                          className="text-3xs rounded-xs bg-zinc-100 px-1.5 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        >
                          {fw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-zinc-500 italic"
                >
                  No files matched the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
