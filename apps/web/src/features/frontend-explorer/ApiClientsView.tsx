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
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            Frontend API Client Calls ({filtered.length} of {apiCalls.length})
          </h2>
          <p className="text-xs text-neutral-600">
            Discovered network requests from fetch, axios, and custom clients
            distinguishing static literal endpoints from dynamic templates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by HTTP method"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
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
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
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
            <tr className="border-b border-dotted border-neutral-200 text-neutral-600">
              <th className="pb-2 font-medium">Method</th>
              <th className="pb-2 font-medium">Endpoint</th>
              <th className="pb-2 font-medium">Target Type</th>
              <th className="pb-2 font-medium">Client Library</th>
              <th className="pb-2 font-medium">Caller Component</th>
              <th className="pb-2 font-medium">Source Evidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-neutral-100">
            {filtered.map((call) => {
              const shortComp =
                call.componentId.split(":")[4] ?? call.componentId;
              return (
                <tr key={call.id} className="hover:bg-neutral-50/50">
                  <td className="py-2.5 pr-3 font-mono text-[11px] font-bold">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        call.method === "GET"
                          ? "bg-neutral-100 text-neutral-800"
                          : call.method === "POST"
                            ? "bg-neutral-100 text-neutral-800"
                            : call.method === "DELETE"
                              ? "bg-neutral-100 text-neutral-800"
                              : "bg-neutral-100 text-neutral-800"
                      }`}
                    >
                      {call.method}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-neutral-900">
                    {call.endpoint}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    {call.isDynamic ? (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-800">
                        Dynamic Template
                      </span>
                    ) : (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700">
                        Static Literal
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-neutral-600">
                    {call.clientType}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    {onSelectComponent ? (
                      <button
                        type="button"
                        onClick={() => onSelectComponent(call.componentId)}
                        className="text-neutral-800 hover:underline"
                      >
                        {shortComp}
                      </button>
                    ) : (
                      <span className="text-neutral-700">{shortComp}</span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-neutral-600">
                    {call.filePath}:{call.sourceEvidence.startLine}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-neutral-600"
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
