"use client";

import { useState } from "react";
import type { FrontendHookCall, FrontendState } from "@codaryn/contracts";

type HooksStateViewProps = {
  hooks: FrontendHookCall[];
  state: FrontendState[];
  onSelectComponent?: (componentId: string) => void;
};

export function HooksStateView({
  hooks,
  state,
  onSelectComponent,
}: HooksStateViewProps) {
  const [subTab, setSubTab] = useState<"hooks" | "state">("hooks");
  const [hookKindFilter, setHookKindFilter] = useState("all");
  const [stateKindFilter, setStateKindFilter] = useState("all");

  const filteredHooks = hooks.filter((h) => {
    if (hookKindFilter !== "all" && h.kind !== hookKindFilter) return false;
    return true;
  });

  const filteredState = state.filter((s) => {
    if (stateKindFilter !== "all" && s.kind !== stateKindFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 border-b border-dotted border-neutral-200">
          <button
            type="button"
            onClick={() => setSubTab("hooks")}
            className={`border-b-2 pb-2 text-xs font-semibold ${
              subTab === "hooks"
                ? "border-neutral-500 text-neutral-800"
                : "border-transparent text-neutral-600 hover:text-neutral-700"
            }`}
          >
            React Hooks ({hooks.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("state")}
            className={`border-b-2 pb-2 text-xs font-semibold ${
              subTab === "state"
                ? "border-neutral-500 text-neutral-800"
                : "border-transparent text-neutral-600 hover:text-neutral-700"
            }`}
          >
            State Management ({state.length})
          </button>
        </div>

        <div>
          {subTab === "hooks" ? (
            <select
              aria-label="Filter hooks by kind"
              value={hookKindFilter}
              onChange={(e) => setHookKindFilter(e.target.value)}
              className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
            >
              <option value="all">All Hook Types</option>
              <option value="state">State (useState/useReducer)</option>
              <option value="effect">Effect (useEffect/useLayoutEffect)</option>
              <option value="context">Context (useContext)</option>
              <option value="ref">Ref (useRef)</option>
              <option value="memo">Memo (useMemo)</option>
              <option value="callback">Callback (useCallback)</option>
              <option value="custom">Custom (use*)</option>
            </select>
          ) : (
            <select
              aria-label="Filter state by kind"
              value={stateKindFilter}
              onChange={(e) => setStateKindFilter(e.target.value)}
              className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-none"
            >
              <option value="all">All State Types</option>
              <option value="local">Local Component State</option>
              <option value="zustand">Zustand Store</option>
              <option value="redux">Redux Store</option>
              <option value="query">TanStack Query</option>
              <option value="context">React Context</option>
            </select>
          )}
        </div>
      </div>

      {subTab === "hooks" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dotted border-neutral-200 text-neutral-600">
                <th className="pb-2 font-medium">Hook Name</th>
                <th className="pb-2 font-medium">Kind</th>
                <th className="pb-2 font-medium">Dependencies</th>
                <th className="pb-2 font-medium">Source Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-neutral-100">
              {filteredHooks.map((h) => (
                <tr key={h.id} className="hover:bg-neutral-50/50">
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-neutral-900">
                    {onSelectComponent ? (
                      <button
                        type="button"
                        onClick={() => onSelectComponent(h.componentId)}
                        className="text-neutral-800 hover:underline"
                      >
                        {h.name}
                      </button>
                    ) : (
                      h.name
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-700">
                      {h.kind}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-neutral-600">
                    {h.dependencies && h.dependencies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {h.dependencies.map((dep) => (
                          <span
                            key={dep}
                            className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] text-neutral-800"
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-neutral-600">
                    {h.sourceEvidence.path}:{h.sourceEvidence.startLine}
                  </td>
                </tr>
              ))}

              {filteredHooks.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-xs text-neutral-600"
                  >
                    No hooks match the specified filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "state" && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-dotted border-neutral-200 text-neutral-600">
                <th className="pb-2 font-medium">Identifier</th>
                <th className="pb-2 font-medium">Pattern</th>
                <th className="pb-2 font-medium">Initial Value</th>
                <th className="pb-2 font-medium">Source Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-neutral-100">
              {filteredState.map((st) => (
                <tr key={st.id} className="hover:bg-neutral-50/50">
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-neutral-900">
                    {onSelectComponent ? (
                      <button
                        type="button"
                        onClick={() => onSelectComponent(st.componentId)}
                        className="text-neutral-800 hover:underline"
                      >
                        {st.identifier}
                      </button>
                    ) : (
                      st.identifier
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-700">
                      {st.kind}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-neutral-600">
                    {st.initialValue ? (
                      <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-800">
                        {st.initialValue}
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-neutral-600">
                    {st.sourceEvidence.path}:{st.sourceEvidence.startLine}
                  </td>
                </tr>
              ))}

              {filteredState.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-xs text-neutral-600"
                  >
                    No state variables match the specified filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
