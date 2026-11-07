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
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            API Route Inventory ({filtered.length} of {routes.length})
          </h2>
          <p className="text-xs text-neutral-600">
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

          <select
            aria-label="Filter by framework"
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
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
            <tr className="border-b border-dotted border-neutral-200 text-neutral-600">
              <th className="pb-2 font-medium">Method</th>
              <th className="pb-2 font-medium">Path</th>
              <th className="pb-2 font-medium">Framework</th>
              <th className="pb-2 font-medium">Handler / Controller</th>
              <th className="pb-2 font-medium">Middleware</th>
              <th className="pb-2 font-medium">Location</th>
              <th className="pb-2 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-neutral-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-neutral-600">
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
                    className={`cursor-pointer transition-colors hover:bg-neutral-50 ${
                      isSelected ? "bg-neutral-100/50" : ""
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
                    <td className="py-2.5 pr-3 font-mono text-neutral-900">
                      <span>{r.path}</span>
                      {r.isDynamic && (
                        <span className="ml-1.5 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                          dynamic
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-600 capitalize">
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700">
                        {r.framework}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-neutral-800">
                      <span className="font-mono font-medium">
                        {r.handlerName}
                      </span>
                      {r.controllerName && (
                        <span className="ml-1.5 text-neutral-600">
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
                              className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[11px] text-neutral-600">
                      {r.filePath}:{r.sourceEvidence.startLine}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRoute(r.id);
                        }}
                        className="rounded border border-dotted border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-700 hover:bg-neutral-100"
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
