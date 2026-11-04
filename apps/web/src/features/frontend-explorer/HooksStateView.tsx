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
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setSubTab("hooks")}
            className={`border-b-2 pb-2 text-xs font-semibold ${
              subTab === "hooks"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
            }`}
          >
            React Hooks ({hooks.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab("state")}
            className={`border-b-2 pb-2 text-xs font-semibold ${
              subTab === "state"
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
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
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
              className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 font-medium">Hook Name</th>
                <th className="pb-2 font-medium">Kind</th>
                <th className="pb-2 font-medium">Dependencies</th>
                <th className="pb-2 font-medium">Source Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredHooks.map((h) => (
                <tr
                  key={h.id}
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
                >
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {onSelectComponent ? (
                      <button
                        type="button"
                        onClick={() => onSelectComponent(h.componentId)}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {h.name}
                      </button>
                    ) : (
                      h.name
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {h.kind}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                    {h.dependencies && h.dependencies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {h.dependencies.map((dep) => (
                          <span
                            key={dep}
                            className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                          >
                            {dep}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-zinc-500">
                    {h.sourceEvidence.path}:{h.sourceEvidence.startLine}
                  </td>
                </tr>
              ))}

              {filteredHooks.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-xs text-zinc-500"
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
              <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
                <th className="pb-2 font-medium">Identifier</th>
                <th className="pb-2 font-medium">Pattern</th>
                <th className="pb-2 font-medium">Initial Value</th>
                <th className="pb-2 font-medium">Source Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
              {filteredState.map((st) => (
                <tr
                  key={st.id}
                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
                >
                  <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {onSelectComponent ? (
                      <button
                        type="button"
                        onClick={() => onSelectComponent(st.componentId)}
                        className="text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        {st.identifier}
                      </button>
                    ) : (
                      st.identifier
                    )}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px]">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {st.kind}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                    {st.initialValue ? (
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                        {st.initialValue}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 font-mono text-[11px] text-zinc-500">
                    {st.sourceEvidence.path}:{st.sourceEvidence.startLine}
                  </td>
                </tr>
              ))}

              {filteredState.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="py-8 text-center text-xs text-zinc-500"
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
