"use client";
import { httpMethodClassName } from "./method-classes";

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

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            End-to-End Request Lifecycle Traces ({filtered.length} of{" "}
            {flows.length})
          </h2>
          <p className="text-xs text-neutral-600">
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
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
          />

          <select
            aria-label="Filter by method"
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
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-600">
            No request flows found matching criteria.
          </div>
        ) : (
          filtered.map((flow) => (
            <div
              key={flow.id}
              className="flex flex-col gap-3 rounded-lg border border-dotted border-neutral-200 bg-neutral-50/50 p-4 transition-colors hover:border-neutral-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dotted border-neutral-200/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${httpMethodClassName(
                      flow.httpMethod,
                    )}`}
                  >
                    {flow.httpMethod}
                  </span>
                  <span className="font-mono text-xs font-semibold text-neutral-900">
                    {flow.routePath}
                  </span>
                </div>
                {onSelectRoute && (
                  <button
                    type="button"
                    onClick={() => onSelectRoute(flow.routeId)}
                    className="text-[11px] font-medium text-neutral-800 hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-500"
                  >
                    View Details &rarr;
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 rounded-md border border-dotted border-neutral-200 bg-white px-2.5 py-1">
                  <span className="text-[10px] font-bold text-neutral-600 uppercase">
                    Route
                  </span>
                  <span className="font-mono text-[11px] font-medium text-neutral-800">
                    {flow.httpMethod} {flow.routePath}
                  </span>
                </div>

                <span className="text-neutral-600">&rarr;</span>

                <div className="flex items-center gap-1.5 rounded-md border border-neutral-500/70 bg-neutral-100/50 px-2.5 py-1">
                  <span className="text-[10px] font-bold text-neutral-800 uppercase">
                    Middleware ({flow.middlewareChain.length})
                  </span>
                  <span className="font-mono text-[11px] text-neutral-800">
                    {flow.middlewareChain.length > 0
                      ? flow.middlewareChain.join(" &bull; ")
                      : "Direct"}
                  </span>
                </div>

                <span className="text-neutral-600">&rarr;</span>

                <div className="flex items-center gap-1.5 rounded-md border border-neutral-500/70 bg-neutral-100/50 px-2.5 py-1">
                  <span className="text-[10px] font-bold text-neutral-800 uppercase">
                    Controller
                  </span>
                  <span className="font-mono text-[11px] font-medium text-neutral-800">
                    {flow.controllerName ?? "Inline Handler"}
                  </span>
                </div>

                <span className="text-neutral-600">&rarr;</span>

                <div className="flex items-center gap-1.5 rounded-md border border-neutral-500/70 bg-neutral-100/50 px-2.5 py-1">
                  <span className="text-[10px] font-bold text-neutral-800 uppercase">
                    Services ({flow.serviceNames.length})
                  </span>
                  <span className="font-mono text-[11px] text-neutral-800">
                    {flow.serviceNames.length > 0
                      ? flow.serviceNames.join(", ")
                      : "None"}
                  </span>
                </div>

                <span className="text-neutral-600">&rarr;</span>

                <div className="flex items-center gap-1.5 rounded-md border border-neutral-500/70 bg-neutral-100/50 px-2.5 py-1">
                  <span className="text-[10px] font-bold text-neutral-800 uppercase">
                    Repositories ({flow.repositoryNames.length})
                  </span>
                  <span className="font-mono text-[11px] text-neutral-800">
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
