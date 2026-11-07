"use client";

import { useState } from "react";
import type { BackendMiddleware } from "@codaryn/contracts";

type MiddlewareChainViewProps = {
  middleware: BackendMiddleware[];
};

export function MiddlewareChainView({ middleware }: MiddlewareChainViewProps) {
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = middleware.filter((m) => {
    if (kindFilter !== "all" && m.kind !== kindFilter) return false;
    if (scopeFilter !== "all" && m.scope !== scopeFilter) return false;
    if (
      search &&
      !m.name.toLowerCase().includes(search.toLowerCase()) &&
      !m.filePath.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const getKindBadge = (kind: string) => {
    switch (kind) {
      case "auth":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "validation":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "logging":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "rate_limit":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "cors":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200   ";
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">
            Middleware &amp; Guards Pipeline ({filtered.length} of{" "}
            {middleware.length})
          </h2>
          <p className="text-xs text-neutral-600">
            Authentication guards, validation schemas, rate limiters, and
            request hooks ordered by scope.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Filter middleware"
            placeholder="Search middleware…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
          />

          <select
            aria-label="Filter by middleware kind"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
          >
            <option value="all">All Kinds</option>
            <option value="auth">Auth &amp; Guards</option>
            <option value="validation">Validation</option>
            <option value="logging">Logging</option>
            <option value="rate_limit">Rate Limiting</option>
            <option value="cors">CORS</option>
            <option value="custom">Custom</option>
          </select>

          <select
            aria-label="Filter by middleware scope"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
          >
            <option value="all">All Scopes</option>
            <option value="global">Global</option>
            <option value="router">Router</option>
            <option value="route">Route</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-neutral-600">
            No middleware found matching criteria.
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between gap-2 rounded-lg border border-dotted border-neutral-200 bg-white p-3.5 transition-shadow hover:shadow-sm"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-neutral-900">
                    {m.name}
                  </span>
                  <span
                    className={`inline-block rounded border px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${getKindBadge(
                      m.kind,
                    )}`}
                  >
                    {m.kind}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-600">
                  <span>Scope:</span>
                  <span className="py-0.2 rounded bg-neutral-100 px-1.5 text-[10px] font-medium text-neutral-700 capitalize">
                    {m.scope}
                  </span>
                </div>
              </div>

              <div className="border-t border-dotted border-neutral-100 pt-2 font-mono text-[10px] text-neutral-600">
                {m.filePath}:{m.sourceEvidence.startLine}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
