"use client";

import { useState } from "react";
import type { FrontendComponent } from "@codaryn/contracts";

type ComponentHierarchyProps = {
  components: FrontendComponent[];
  selectedComponentId: string | null;
  onSelectComponent: (componentId: string) => void;
};

export function ComponentHierarchy({
  components,
  selectedComponentId,
  onSelectComponent,
}: ComponentHierarchyProps) {
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");

  const filtered = components.filter((comp) => {
    if (kindFilter !== "all" && comp.kind !== kindFilter) return false;
    if (
      search &&
      !comp.name.toLowerCase().includes(search.toLowerCase()) &&
      !comp.filePath.toLowerCase().includes(search.toLowerCase())
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
            React Components ({filtered.length} of {components.length})
          </h2>
          <p className="text-xs text-neutral-600">
            Discovered components, functional/class definitions, props, and
            render links.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            aria-label="Filter components"
            placeholder="Search components or paths…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 placeholder-neutral-600 focus:border-neutral-500 focus:outline-none"
          />

          <select
            aria-label="Filter by component kind"
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
          >
            <option value="all">All Kinds</option>
            <option value="function">Function</option>
            <option value="arrow">Arrow</option>
            <option value="class">Class</option>
            <option value="memo">Memo</option>
            <option value="forward_ref">ForwardRef</option>
            <option value="lazy">Lazy</option>
          </select>
        </div>
      </div>

      <div className="grid max-h-[600px] grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((comp) => {
          const isSelected = comp.id === selectedComponentId;
          return (
            <button
              key={comp.id}
              type="button"
              onClick={() => onSelectComponent(comp.id)}
              className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition ${
                isSelected
                  ? "border-neutral-500 bg-neutral-100/60 shadow-sm"
                  : "border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 hover:bg-neutral-100/50"
              }`}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="truncate font-mono text-xs font-semibold text-neutral-900">
                  {comp.name}
                </span>
                <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700">
                  {comp.kind}
                </span>
              </div>

              <span className="truncate font-mono text-[11px] text-neutral-600">
                {comp.filePath}:{comp.sourceEvidence.startLine}
              </span>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-neutral-600">
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">
                  Export: {comp.exportType}
                </span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">
                  Props: {comp.props.length}
                </span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">
                  Hooks: {comp.hooksCount}
                </span>
                <span className="rounded bg-neutral-100 px-1.5 py-0.5">
                  Renders: {comp.renderedComponentsCount}
                </span>
              </div>
            </button>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-lg border border-dotted border-neutral-200 p-8 text-center text-xs text-neutral-600">
            No components match the specified filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
