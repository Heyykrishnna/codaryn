"use client";

import { useState } from "react";
import type { RequestFlow } from "@codaryn/contracts";

type RequestLifecycleViewProps = {
  flows: RequestFlow[];
  onSelectRoute?: (routeId: string) => void;
};

export function RequestLifecycleView({
  flows,
  onSelectRoute,
}: RequestLifecycleViewProps) {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const filtered = flows.filter((f) => {
    if (methodFilter !== "all" && f.httpMethod !== methodFilter) return false;
    if (
      search &&
      !f.routePath.toLowerCase().includes(search.toLowerCase()) &&
      !(
        f.controllerName &&
        f.controllerName.toLowerCase().includes(search.toLowerCase())
      ) &&
      !f.serviceNames.some((s) =>
        s.toLowerCase().includes(search.toLowerCase()),
      ) &&
      !f.repositoryNames.some((r) =>
        r.toLowerCase().includes(search.toLowerCase()),
      )
    ) {
      return false;
    }
    return true;
  });

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
      case "POST":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
      case "PUT":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
      case "PATCH":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800";
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            End-to-End Request Lifecycle Traces ({filtered.length} of{" "}
            {flows.length})
          </h2>
          <p className="text-xs text-zinc-500">
            Cross-layer call flows connecting routes through middleware,
            controllers, services, down to repositories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Filter request flows"
            placeholder="Search path, service, repo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />

          <select
            aria-label="Filter by method"
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
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400">
            No request flows found matching criteria.
          </div>
        ) : (
          filtered.map((flow) => (
            <div
              key={flow.id}
              onClick={() => onSelectRoute?.(flow.routeId)}
              className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/30 dark:hover:border-zinc-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200/60 pb-2.5 dark:border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${getMethodBadgeColor(
                      flow.httpMethod,
                    )}`}
                  >
                    {flow.httpMethod}
                  </span>
                  <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {flow.routePath}
                  </span>
                </div>
                {onSelectRoute && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRoute(flow.routeId);
                    }}
                    className="text-[11px] font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    View Details &rarr;
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-950">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">
                    Route
                  </span>
                  <span className="font-mono text-[11px] font-medium text-zinc-800 dark:text-zinc-200">
                    {flow.httpMethod} {flow.routePath}
                  </span>
                </div>

                <span className="text-zinc-400">&rarr;</span>

                <div className="flex items-center gap-1.5 rounded-md border border-purple-200/70 bg-purple-50/50 px-2.5 py-1 dark:border-purple-900/40 dark:bg-purple-950/20">
                  <span className="text-[10px] font-bold text-purple-600 uppercase dark:text-purple-400">
                    Middleware ({flow.middlewareChain.length})
                  </span>
                  <span className="font-mono text-[11px] text-purple-800 dark:text-purple-200">
                    {flow.middlewareChain.length > 0
                      ? flow.middlewareChain.join(" &bull; ")
                      : "Direct"}
                  </span>
                </div>

                <span className="text-zinc-400">&rarr;</span>

                <div className="flex items-center gap-1.5 rounded-md border border-indigo-200/70 bg-indigo-50/50 px-2.5 py-1 dark:border-indigo-900/40 dark:bg-indigo-950/20">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase dark:text-indigo-400">
                    Controller
                  </span>
                  <span className="font-mono text-[11px] font-medium text-indigo-800 dark:text-indigo-200">
                    {flow.controllerName ?? "Inline Handler"}
                  </span>
                </div>

                <span className="text-zinc-400">&rarr;</span>

                <div className="flex items-center gap-1.5 rounded-md border border-blue-200/70 bg-blue-50/50 px-2.5 py-1 dark:border-blue-900/40 dark:bg-blue-950/20">
                  <span className="text-[10px] font-bold text-blue-600 uppercase dark:text-blue-400">
                    Services ({flow.serviceNames.length})
                  </span>
                  <span className="font-mono text-[11px] text-blue-800 dark:text-blue-200">
                    {flow.serviceNames.length > 0
                      ? flow.serviceNames.join(", ")
                      : "None"}
                  </span>
                </div>

                <span className="text-zinc-400">&rarr;</span>

                <div className="flex items-center gap-1.5 rounded-md border border-emerald-200/70 bg-emerald-50/50 px-2.5 py-1 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase dark:text-emerald-400">
                    Repositories ({flow.repositoryNames.length})
                  </span>
                  <span className="font-mono text-[11px] text-emerald-800 dark:text-emerald-200">
                    {flow.repositoryNames.length > 0
                      ? flow.repositoryNames.join(", ")
                      : "None"}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
