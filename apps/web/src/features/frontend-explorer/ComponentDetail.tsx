"use client";

import type { FrontendComponentDetailResponse } from "@codaryn/contracts";

type ComponentDetailProps = {
  detail: FrontendComponentDetailResponse;
  onClose: () => void;
  onSelectComponent?: (componentId: string) => void;
};

export function ComponentDetail({
  detail,
  onClose,
  onSelectComponent,
}: ComponentDetailProps) {
  const {
    component,
    renderedComponents,
    hooks,
    state,
    contextsConsumed,
    apiCalls,
    incomingRenders,
  } = detail;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-dotted border-neutral-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono text-base font-bold text-neutral-900">
              {component.name}
            </h3>
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-800">
              {component.kind}
            </span>
            <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
              {component.exportType} export
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-neutral-600">
            {component.filePath}:{component.sourceEvidence.startLine}–
            {component.sourceEvidence.endLine}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Close component details"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-5 text-xs">
        <div>
          <h4 className="font-semibold text-neutral-800">
            Props Specification ({component.props.length})
          </h4>
          {component.props.length > 0 ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dotted border-neutral-100 text-[11px] text-neutral-600">
                    <th className="pb-1.5 font-medium">Prop Name</th>
                    <th className="pb-1.5 font-medium">Type</th>
                    <th className="pb-1.5 font-medium">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-neutral-100">
                  {component.props.map((p) => (
                    <tr key={p.name}>
                      <td className="py-1.5 pr-2 font-mono font-semibold text-neutral-900">
                        {p.name}
                      </td>
                      <td className="py-1.5 pr-2 font-mono text-[11px] text-neutral-600">
                        {p.type ?? "any"}
                      </td>
                      <td className="py-1.5">
                        {p.required ? (
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-800">
                            Required
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-600">
                            Optional
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-1 text-neutral-600">No props accepted.</p>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-neutral-800">
            Rendered Subcomponents ({renderedComponents.length})
          </h4>
          {renderedComponents.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {renderedComponents.map((jsx) => (
                <div
                  key={jsx.id}
                  className="flex items-center gap-1.5 rounded-lg border border-dotted border-neutral-200 bg-neutral-50 px-2.5 py-1.5"
                >
                  {jsx.targetComponentId && onSelectComponent ? (
                    <button
                      type="button"
                      onClick={() => onSelectComponent(jsx.targetComponentId!)}
                      className="font-mono text-xs font-semibold text-neutral-800 hover:underline"
                    >
                      &lt;{jsx.targetComponentName} /&gt;
                    </button>
                  ) : (
                    <span className="font-mono text-xs font-semibold text-neutral-800">
                      &lt;{jsx.targetComponentName} /&gt;
                    </span>
                  )}
                  {jsx.isConditional && (
                    <span className="py-0.2 rounded bg-neutral-100 px-1 text-[9px] text-neutral-800">
                      Conditional
                    </span>
                  )}
                  {jsx.props.length > 0 && (
                    <span className="text-[10px] text-neutral-600">
                      props: {jsx.props.join(", ")}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-neutral-600">
              No custom subcomponents rendered.
            </p>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-neutral-800">
            Rendered By (Inbound References: {incomingRenders.length})
          </h4>
          {incomingRenders.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {incomingRenders.map((jsx) => {
                const parentName =
                  jsx.sourceComponentId.split(":")[4] ?? jsx.sourceComponentId;
                return (
                  <div
                    key={jsx.id}
                    className="flex items-center gap-1.5 rounded-lg border border-dotted border-neutral-200 bg-neutral-50 px-2.5 py-1.5"
                  >
                    {onSelectComponent ? (
                      <button
                        type="button"
                        onClick={() => onSelectComponent(jsx.sourceComponentId)}
                        className="font-mono text-xs font-semibold text-neutral-800 hover:underline"
                      >
                        {parentName}
                      </button>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-neutral-800">
                        {parentName}
                      </span>
                    )}
                    <span className="font-mono text-[10px] text-neutral-600">
                      L{jsx.sourceEvidence.startLine}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-1 text-neutral-600">
              No inbound parent render references recorded.
            </p>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-neutral-800">
            Attached Hooks ({hooks.length})
          </h4>
          {hooks.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {hooks.map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg border border-dotted border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs"
                >
                  <span className="font-mono font-semibold text-neutral-900">
                    {h.name}
                  </span>
                  <span className="ml-1.5 text-[10px] text-neutral-600">
                    ({h.kind})
                  </span>
                  {h.dependencies && h.dependencies.length > 0 && (
                    <span className="ml-1.5 font-mono text-[10px] text-neutral-600">
                      deps: [{h.dependencies.join(", ")}]
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-neutral-600">No React hooks used.</p>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-neutral-800">
            State Variables ({state.length})
          </h4>
          {state.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {state.map((st) => (
                <div
                  key={st.id}
                  className="rounded-lg border border-dotted border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs"
                >
                  <span className="font-mono font-semibold text-neutral-900">
                    {st.identifier}
                  </span>
                  <span className="ml-1.5 text-[10px] text-neutral-600">
                    ({st.kind})
                  </span>
                  {st.initialValue && (
                    <span className="ml-1.5 font-mono text-[10px] text-neutral-600">
                      = {st.initialValue}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-neutral-600">
              No state variables registered.
            </p>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-neutral-800">
            Contexts Consumed ({contextsConsumed.length})
          </h4>
          {contextsConsumed.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {contextsConsumed.map((ctx) => (
                <div
                  key={ctx.id}
                  className="rounded-lg border border-dotted border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs"
                >
                  <span className="font-mono font-semibold text-neutral-900">
                    {ctx.name}
                  </span>
                  {ctx.defaultValue && (
                    <span className="ml-1.5 font-mono text-[10px] text-neutral-600">
                      (default: {ctx.defaultValue})
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-neutral-600">No context consumed.</p>
          )}
        </div>

        <div>
          <h4 className="font-semibold text-neutral-800">
            API Client Calls ({apiCalls.length})
          </h4>
          {apiCalls.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1.5">
              {apiCalls.map((call) => (
                <div
                  key={call.id}
                  className="flex items-center gap-2 rounded-lg border border-dotted border-neutral-200 bg-neutral-50 px-2.5 py-1.5"
                >
                  <span className="font-mono text-[11px] font-bold text-neutral-800">
                    {call.method}
                  </span>
                  <span className="font-mono text-xs text-neutral-800">
                    {call.endpoint}
                  </span>
                  <span className="text-[10px] text-neutral-600">
                    ({call.clientType}, {call.isDynamic ? "dynamic" : "static"})
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-neutral-600">
                    L{call.sourceEvidence.startLine}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-neutral-600">
              No API calls in this component.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
