"use client";

import type { FrontendContext } from "@codaryn/contracts";

type ContextsViewProps = {
  contexts: FrontendContext[];
  onSelectComponent?: (componentId: string) => void;
};

export function ContextsView({
  contexts,
  onSelectComponent,
}: ContextsViewProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Context Providers &amp; Consumers ({contexts.length})
        </h2>
        <p className="text-xs text-zinc-500">
          Traceable React Context definitions with provider components and
          consumer component links.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="pb-2 font-medium">Context Name</th>
              <th className="pb-2 font-medium">Default Value</th>
              <th className="pb-2 font-medium">Providers</th>
              <th className="pb-2 font-medium">Consumers</th>
              <th className="pb-2 font-medium">File Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {contexts.map((ctx) => (
              <tr
                key={ctx.id}
                className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50"
              >
                <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {ctx.name}
                </td>
                <td className="py-2.5 pr-3 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                  {ctx.defaultValue ? (
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {ctx.defaultValue}
                    </span>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 font-mono text-[11px]">
                  {ctx.providerComponentIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {ctx.providerComponentIds.map((pId) => {
                        const shortName = pId.split(":")[4] ?? pId;
                        return onSelectComponent ? (
                          <button
                            key={pId}
                            type="button"
                            onClick={() => onSelectComponent(pId)}
                            className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                          >
                            {shortName}
                          </button>
                        ) : (
                          <span
                            key={pId}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {shortName}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 font-mono text-[11px]">
                  {ctx.consumerComponentIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {ctx.consumerComponentIds.map((cId) => {
                        const shortName = cId.split(":")[4] ?? cId;
                        return onSelectComponent ? (
                          <button
                            key={cId}
                            type="button"
                            onClick={() => onSelectComponent(cId)}
                            className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
                          >
                            {shortName}
                          </button>
                        ) : (
                          <span
                            key={cId}
                            className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                          >
                            {shortName}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-zinc-400">—</span>
                  )}
                </td>
                <td className="py-2.5 font-mono text-[11px] text-zinc-500">
                  {ctx.filePath}:{ctx.sourceEvidence.startLine}
                </td>
              </tr>
            ))}

            {contexts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-xs text-zinc-500"
                >
                  No React context definitions discovered in this project.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
