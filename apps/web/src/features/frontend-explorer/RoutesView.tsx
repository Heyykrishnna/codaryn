"use client";

import { useState } from "react";
import type { FrontendRoute } from "@codaryn/contracts";

type RoutesViewProps = {
  routes: FrontendRoute[];
  onSelectComponent?: (componentId: string) => void;
};

export function RoutesView({ routes, onSelectComponent }: RoutesViewProps) {
  const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = routes.filter((r) => {
    if (frameworkFilter !== "all" && r.framework !== frameworkFilter)
      return false;
    if (
      search &&
      !r.routePath.toLowerCase().includes(search.toLowerCase()) &&
      !r.filePath.toLowerCase().includes(search.toLowerCase()) &&
      !(
        r.componentName &&
        r.componentName.toLowerCase().includes(search.toLowerCase())
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
            Route Tree &amp; Pages ({filtered.length} of {routes.length})
          </h2>
          <p className="text-xs text-neutral-600">
            Detected Next.js App/Pages Router and React Router endpoints with
            dynamic parameters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Filter routes"
            placeholder="Search routes or files…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
          />

          <select
            aria-label="Filter by framework"
            value={frameworkFilter}
            onChange={(e) => setFrameworkFilter(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
          >
            <option value="all">All Frameworks</option>
            <option value="nextjs_app">Next.js App Router</option>
            <option value="nextjs_pages">Next.js Pages Router</option>
            <option value="react_router">React Router</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-dotted border-neutral-200 text-neutral-600">
              <th className="pb-2 font-medium">Framework</th>
              <th className="pb-2 font-medium">Route Path</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Dynamic Params</th>
              <th className="pb-2 font-medium">Component</th>
              <th className="pb-2 font-medium">File Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-neutral-100">
            {filtered.map((route) => (
              <tr key={route.id} className="hover:bg-neutral-50/50">
                <td className="py-2.5 pr-3 font-mono text-[11px]">
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-700">
                    {route.framework}
                  </span>
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-neutral-900">
                  {route.routePath}
                </td>
                <td className="py-2.5 pr-3">
                  {route.isLayout ? (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-800">
                      Layout
                    </span>
                  ) : (
                    <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-800">
                      Page
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 font-mono text-[11px] text-neutral-600">
                  {route.dynamicParams.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {route.dynamicParams.map((param) => (
                        <span
                          key={param}
                          className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-800"
                        >
                          {param}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 font-mono text-[11px]">
                  {route.componentName ? (
                    route.componentId && onSelectComponent ? (
                      <button
                        type="button"
                        onClick={() => onSelectComponent(route.componentId!)}
                        className="text-neutral-800 hover:underline"
                      >
                        {route.componentName}
                      </button>
                    ) : (
                      <span className="text-neutral-700">
                        {route.componentName}
                      </span>
                    )
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
                <td className="py-2.5 font-mono text-[11px] text-neutral-600">
                  {route.filePath}:{route.sourceEvidence.startLine}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-neutral-600"
                >
                  No routes match the specified filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
