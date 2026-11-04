"use client";

import { useState } from "react";
import type { FrontendApiClientCall } from "@codaryn/contracts";

type ApiClientsViewProps = {
  apiCalls: FrontendApiClientCall[];
  onSelectComponent?: (componentId: string) => void;
};

export function ApiClientsView({
  apiCalls,
  onSelectComponent,
}: ApiClientsViewProps) {
  const [methodFilter, setMethodFilter] = useState("all");
  const [clientTypeFilter, setClientTypeFilter] = useState("all");

  const filtered = apiCalls.filter((call) => {
    if (methodFilter !== "all" && call.method !== methodFilter) return false;
    if (clientTypeFilter !== "all" && call.clientType !== clientTypeFilter)
      return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Frontend API Client Calls ({filtered.length} of {apiCalls.length})
          </h2>
          <p className="text-xs text-zinc-500">
            Discovered network requests from fetch, axios, and custom clients
            distinguishing static literal endpoints from dynamic templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by HTTP method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
          </select>

          <select
            aria-label="Filter by client library"
            value={clientTypeFilter}
            onChange={(e) => setClientTypeFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All Clients</option>
            <option value="fetch">Fetch API</option>
            <option value="axios">Axios</option>
            <option value="custom">Custom Client</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="pb-2 font-medium">Method</th>
              <th className="pb-2 font-medium">Endpoint</th>
              <th className="pb-2 font-medium">Target Type</th>
              <th className="pb-2 font-medium">Client Library</th>
              <th className="pb-2 font-medium">Caller Component</th>
              <th className="pb-2 font-medium">Source Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {filtered.map((call) => {
              const shortComp =
                call.componentId.split(":")[4] ?? call.componentId;
              return (
                <tr
                  key={call.id}
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
                >
                  <td className="py-2.5 pr-3 font-mono text-[11px] font-bold">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        call.method === "GET"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : call.method === "POST"
                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                            : call.method === "DELETE"
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {call.method}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {call.endpoint}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    {call.isDynamic ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        Dynamic Template
                      </span>
                    ) : (
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        Static Literal
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                    {call.clientType}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    {onSelectComponent ? (
                      <button
                        type="button"
                        onClick={() => onSelectComponent(call.componentId)}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {shortComp}
                      </button>
                    ) : (
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {shortComp}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-zinc-500">
                    {call.filePath}:{call.sourceEvidence.startLine}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-zinc-500"
                >
                  No API client calls match the specified filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
