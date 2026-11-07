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
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">
          Context Providers &amp; Consumers ({contexts.length})
        </h2>
        <p className="text-xs text-neutral-600">
          Traceable React Context definitions with provider components and
          consumer component links.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-dotted border-neutral-200 text-neutral-600">
              <th className="pb-2 font-medium">Context Name</th>
              <th className="pb-2 font-medium">Default Value</th>
              <th className="pb-2 font-medium">Providers</th>
              <th className="pb-2 font-medium">Consumers</th>
              <th className="pb-2 font-medium">File Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dotted divide-neutral-100">
            {contexts.map((ctx) => (
              <tr key={ctx.id} className="hover:bg-neutral-50/50">
                <td className="py-2.5 pr-3 font-mono text-xs font-semibold text-neutral-900">
                  {ctx.name}
                </td>
                <td className="py-2.5 pr-3 font-mono text-[11px] text-neutral-600">
                  {ctx.defaultValue ? (
                    <span className="rounded bg-neutral-100 px-2 py-0.5 text-neutral-800">
                      {ctx.defaultValue}
                    </span>
                  ) : (
                    <span className="text-neutral-600">—</span>
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
                            className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-800 hover:bg-neutral-100"
                          >
                            {shortName}
                          </button>
                        ) : (
                          <span
                            key={pId}
                            className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700"
                          >
                            {shortName}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-neutral-600">—</span>
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
                            className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-800 hover:bg-neutral-100"
                          >
                            {shortName}
                          </button>
                        ) : (
                          <span
                            key={cId}
                            className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-700"
                          >
                            {shortName}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-neutral-600">—</span>
                  )}
                </td>
                <td className="py-2.5 font-mono text-[11px] text-neutral-600">
                  {ctx.filePath}:{ctx.sourceEvidence.startLine}
                </td>
              </tr>
            ))}

            {contexts.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-xs text-neutral-600"
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
