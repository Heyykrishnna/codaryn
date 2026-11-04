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
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
      case "validation":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
      case "logging":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
      case "rate_limit":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
      case "cors":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Middleware &amp; Guards Pipeline ({filtered.length} of{" "}
            {middleware.length})
          </h2>
          <p className="text-xs text-zinc-500">
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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 placeholder-zinc-400 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />

          <select
            aria-label="Filter by middleware kind"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
            className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
          <div className="col-span-full py-8 text-center text-xs text-zinc-400">
            No middleware found matching criteria.
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className="flex flex-col justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-3.5 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
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
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>Scope:</span>
                  <span className="py-0.2 rounded bg-zinc-100 px-1.5 text-[10px] font-medium text-zinc-700 capitalize dark:bg-zinc-800 dark:text-zinc-300">
                    {m.scope}
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-100 pt-2 font-mono text-[10px] text-zinc-400 dark:border-zinc-900">
                {m.filePath}:{m.sourceEvidence.startLine}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
