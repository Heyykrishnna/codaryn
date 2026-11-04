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
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs text-zinc-500">Loading endpoint details…</p>
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
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900";
      case "POST":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900";
      case "PUT":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900";
      case "PATCH":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900";
      case "DELETE":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900";
      default:
        return "bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:border-zinc-800";
    }
  };

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-start justify-between border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block rounded border px-2 py-0.5 text-xs font-bold ${getMethodBadgeColor(
                route.method,
              )}`}
            >
              {route.method}
            </span>
            <h2 className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
              {route.path}
            </h2>
          </div>
          <p className="font-mono text-xs text-zinc-500">
            {route.filePath}:{route.sourceEvidence.startLine}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="text-[10px] font-bold text-zinc-400 uppercase">
            Framework
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-zinc-900 capitalize dark:text-zinc-100">
            {route.framework}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="text-[10px] font-bold text-zinc-400 uppercase">
            Handler Name
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {route.handlerName}()
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="text-[10px] font-bold text-zinc-400 uppercase">
            Dynamic Route
          </div>
          <div className="mt-1 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {route.isDynamic ? "Yes (parameterized)" : "No (static)"}
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200/80 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="text-[10px] font-bold text-zinc-400 uppercase">
            Controller
          </div>
          <div className="mt-1 font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {controller ? controller.name : "None (Inline)"}
          </div>
        </div>
      </div>

      {middlewareChain.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Active Middleware &amp; Guards Chain ({middlewareChain.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {middlewareChain.map((mw) => (
              <div
                key={mw.id}
                className="flex items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                  {mw.name}
                </span>
                <span className="py-0.2 rounded bg-zinc-200 px-1.5 text-[10px] font-bold text-zinc-600 uppercase dark:bg-zinc-800 dark:text-zinc-400">
                  {mw.kind}
                </span>
                <span className="text-[10px] text-zinc-400 capitalize">
                  {mw.scope}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {services.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Injected Services ({services.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((svc) => (
              <div
                key={svc.id}
                className="flex flex-col gap-1 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {svc.name}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-400">
                    {svc.filePath}
                  </span>
                </div>
                {svc.methods.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {svc.methods.map((m) => (
                      <span
                        key={m}
                        className="py-0.2 rounded bg-zinc-100 px-1.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
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
          <h3 className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">
            Repositories &amp; Persistence Layer ({repositories.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex flex-col gap-1 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {repo.name}
                  </span>
                  <span className="py-0.2 rounded bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700 uppercase dark:bg-emerald-950 dark:text-emerald-300">
                    {repo.ormType}
                  </span>
                </div>
                {repo.methods.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {repo.methods.map((m) => (
                      <span
                        key={m}
                        className="py-0.2 rounded bg-zinc-100 px-1.5 font-mono text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
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
        <div className="rounded-lg border border-indigo-200/60 bg-indigo-50/30 p-3.5 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <div className="text-xs font-semibold text-indigo-950 dark:text-indigo-200">
            Request Flow Summary
          </div>
          <div className="mt-1 font-mono text-[11px] text-indigo-900/80 dark:text-indigo-300">
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
