"use client";
import { httpMethodClassName } from "./method-classes";

import { useState } from "react";
import type { BackendRoute } from "@codaryn/contracts";

type EndpointInventoryProps = {
  routes: BackendRoute[];
  selectedRouteId?: string | null;
  onSelectRoute: (routeId: string) => void;
};

export function EndpointInventory({
  routes,
  selectedRouteId,
  onSelectRoute,
}: EndpointInventoryProps) {
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = routes.filter((r) => {
    if (methodFilter !== "all" && r.method !== methodFilter) return false;
    if (frameworkFilter !== "all" && r.framework !== frameworkFilter)
      return false;
    if (
      search &&
      !r.path.toLowerCase().includes(search.toLowerCase()) &&
      !r.handlerName.toLowerCase().includes(search.toLowerCase()) &&
      !r.filePath.toLowerCase().includes(search.toLowerCase()) &&
      !(
        r.controllerName &&
        r.controllerName.toLowerCase().includes(search.toLowerCase())
      )
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            API Route Inventory ({filtered.length} of {routes.length})
          </h2>
          <p className="text-xs text-zinc-500">
            Statically discovered HTTP routes across Express, Fastify, and
            NestJS controllers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Filter routes"
            placeholder="Search path, handler, file…"
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

          <select
            aria-label="Filter by framework"
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">All Frameworks</option>
            <option value="express">Express</option>
            <option value="fastify">Fastify</option>
            <option value="nestjs">NestJS</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="pb-2 font-medium">Method</th>
              <th className="pb-2 font-medium">Path</th>
              <th className="pb-2 font-medium">Framework</th>
              <th className="pb-2 font-medium">Handler / Controller</th>
              <th className="pb-2 font-medium">Middleware</th>
              <th className="pb-2 font-medium">Location</th>
              <th className="pb-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-400">
                  No matching endpoints found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const isSelected = r.id === selectedRouteId;
                return (
                  <tr
                    key={r.id}
                    onClick={() => onSelectRoute(r.id)}
                    className={`cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60 ${
                      isSelected ? "bg-indigo-50/50 dark:bg-indigo-950/20" : ""
                    }`}
                  >
                    <td className="py-2.5 pr-3 font-mono font-bold">
                      <span
                        className={`inline-block rounded border px-2 py-0.5 text-[11px] ${httpMethodClassName(
                          r.method,
                        )}`}
                      >
                        {r.method}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-zinc-900 dark:text-zinc-100">
                      <span>{r.path}</span>
                      {r.isDynamic && (
                        <span className="ml-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                          dynamic
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-600 capitalize dark:text-zinc-400">
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {r.framework}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-zinc-800 dark:text-zinc-200">
                      <span className="font-mono font-medium">
                        {r.handlerName}
                      </span>
                      {r.controllerName && (
                        <span className="ml-1.5 text-zinc-400">
                          ({r.controllerName})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3">
                      {r.middleware.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {r.middleware.map((m) => (
                            <span
                              key={m}
                              className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-500">
                      {r.filePath}:{r.sourceEvidence.startLine}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoute(r.id);
                        }}
                        className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
