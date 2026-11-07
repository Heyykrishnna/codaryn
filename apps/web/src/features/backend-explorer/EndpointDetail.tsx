"use client";

import type { BackendRouteDetailResponse } from "@codaryn/contracts";

type EndpointDetailProps = {
  detail: BackendRouteDetailResponse | null;
  loading: boolean;
  onClose: () => void;
};

export function EndpointDetail({
  detail,
  loading,
  onClose,
}: EndpointDetailProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dotted border-neutral-200 bg-white p-6">
        <p className="text-xs text-neutral-600">Loading endpoint details…</p>
      </div>
    );
  }

  if (!detail) return null;

  const {
    route,
    controller,
    services,
    repositories,
    middlewareChain,
    requestFlow,
  } = detail;

  const getMethodBadgeColor = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "POST":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "PUT":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "PATCH":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      case "DELETE":
        return "bg-neutral-100 text-neutral-800 border-neutral-500   ";
      default:
        return "bg-neutral-50 text-neutral-700 border-neutral-200   ";
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-dotted border-neutral-200 bg-white p-5">
      <div className="flex items-start justify-between border-b border-dotted border-neutral-200 pb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${getMethodBadgeColor(
                route.method,
              )}`}
            >
              {route.method}
            </span>
            <h2 className="font-mono text-base font-bold text-neutral-900">
              {route.path}
            </h2>
          </div>
          <p className="font-mono text-xs text-neutral-600">
            {route.filePath}:{route.sourceEvidence.startLine}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-dotted border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-dotted border-neutral-200/80 bg-neutral-50/50 p-3">
          <div className="text-[10px] font-bold text-neutral-600 uppercase">
            Framework
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-neutral-900 capitalize">
            {route.framework}
          </div>
        </div>
        <div className="rounded-lg border border-dotted border-neutral-200/80 bg-neutral-50/50 p-3">
          <div className="text-[10px] font-bold text-neutral-600 uppercase">
            Handler Name
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-neutral-900">
            {route.handlerName}()
          </div>
        </div>
        <div className="rounded-lg border border-dotted border-neutral-200/80 bg-neutral-50/50 p-3">
          <div className="text-[10px] font-bold text-neutral-600 uppercase">
            Dynamic Route
          </div>
          <div className="mt-1 text-xs font-semibold text-neutral-900">
            {route.isDynamic ? "Yes (parameterized)" : "No (static)"}
          </div>
        </div>
        <div className="rounded-lg border border-dotted border-neutral-200/80 bg-neutral-50/50 p-3">
          <div className="text-[10px] font-bold text-neutral-600 uppercase">
            Controller
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-neutral-900">
            {controller ? controller.name : "None (Inline)"}
          </div>
        </div>
      </div>

      {middlewareChain.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
            Active Middleware &amp; Guards Chain ({middlewareChain.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {middlewareChain.map((mw) => (
              <div
                key={mw.id}
                className="flex items-center gap-2 rounded-md border border-dotted border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs"
              >
                <span className="font-mono font-medium text-neutral-800">
                  {mw.name}
                </span>
                <span className="py-0.2 rounded bg-neutral-200 px-1.5 text-[10px] font-bold text-neutral-600 uppercase">
                  {mw.kind}
                </span>
                <span className="text-[10px] text-neutral-600 capitalize">
                  {mw.scope}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
            Injected Services ({services.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col gap-1 rounded-md border border-dotted border-neutral-200 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-neutral-900">
                    {svc.name}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-600">
                    {svc.filePath}
                  </span>
                </div>
                {svc.methods.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {svc.methods.map((m) => (
                      <span
                        key={m}
                        className="py-0.2 rounded bg-neutral-100 px-1.5 font-mono text-[10px] text-neutral-600"
                      >
                        {m}()
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {repositories.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
            Repositories &amp; Persistence Layer ({repositories.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex flex-col gap-1 rounded-md border border-dotted border-neutral-200 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-neutral-900">
                    {repo.name}
                  </span>
                  <span className="py-0.2 rounded bg-neutral-100 px-1.5 text-[10px] font-bold text-neutral-800 uppercase">
                    {repo.ormType}
                  </span>
                </div>
                {repo.methods.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {repo.methods.map((m) => (
                      <span
                        key={m}
                        className="py-0.2 rounded bg-neutral-100 px-1.5 font-mono text-[10px] text-neutral-600"
                      >
                        {m}()
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {requestFlow && (
        <div className="rounded-lg border border-neutral-500/60 bg-neutral-100/30 p-3.5">
          <div className="text-xs font-semibold text-neutral-800">
            Request Flow Summary
          </div>
          <div className="mt-1 font-mono text-[11px] text-neutral-800/80">
            {requestFlow.httpMethod} {requestFlow.routePath} &rarr;{" "}
            {requestFlow.middlewareChain.length > 0
              ? `[${requestFlow.middlewareChain.join(", ")}] &rarr; `
              : ""}
            {requestFlow.controllerName ?? "Inline"} &rarr;{" "}
            {requestFlow.serviceNames.length > 0
              ? `[${requestFlow.serviceNames.join(", ")}] &rarr; `
              : ""}
            {requestFlow.repositoryNames.length > 0
              ? `[${requestFlow.repositoryNames.join(", ")}]`
              : "Direct"}
          </div>
        </div>
      )}
    </div>
  );
}
