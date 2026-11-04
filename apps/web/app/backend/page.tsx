"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  workspaceListSchema,
  type BackendOverviewResponse,
  type BackendRoute,
  type BackendController,
  type BackendService,
  type BackendRepository,
  type BackendMiddleware,
  type RequestFlow,
  type BackendRouteDetailResponse,
  type WorkspaceSummary,
} from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { control, button } from "@/src/features/repositories/api";
import {
  fetchBackendOverview,
  fetchBackendRoutes,
  fetchBackendRouteDetail,
  fetchBackendControllers,
  fetchBackendServices,
  fetchBackendRepositories,
  fetchBackendMiddleware,
  fetchBackendRequestFlows,
  EndpointInventory,
  ControllerServiceView,
  MiddlewareChainView,
  RequestLifecycleView,
  EndpointDetail,
} from "@/src/features/backend-explorer";

function BackendDashboard() {
  const {
    data: session,
    isPending,
    error: authError,
  } = authClient.useSession();
  const searchParams = useSearchParams();

  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [jobId, setJobId] = useState("");
  const [inputJobId, setInputJobId] = useState("");

  const [overview, setOverview] = useState<BackendOverviewResponse | null>(
    null,
  );
  const [routes, setRoutes] = useState<BackendRoute[]>([]);
  const [controllers, setControllers] = useState<BackendController[]>([]);
  const [services, setServices] = useState<BackendService[]>([]);
  const [repositories, setRepositories] = useState<BackendRepository[]>([]);
  const [middleware, setMiddleware] = useState<BackendMiddleware[]>([]);
  const [requestFlows, setRequestFlows] = useState<RequestFlow[]>([]);

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<{
    key: string;
    detail: BackendRouteDetailResponse | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    "endpoints" | "architecture" | "middleware" | "flows"
  >("endpoints");
  const [loadedKey, setLoadedKey] = useState("");
  const [feedback, setFeedback] = useState({ key: "", message: "" });
  const dataKey = JSON.stringify([workspaceId, jobId]);
  const routeKey = JSON.stringify([workspaceId, jobId, selectedRouteId]);
  const busy = Boolean(workspaceId && jobId && loadedKey !== dataKey);
  const detailLoading = Boolean(
    workspaceId && jobId && selectedRouteId && routeResult?.key !== routeKey,
  );
  const routeDetail = routeResult?.key === routeKey ? routeResult.detail : null;
  const message =
    feedback.key === dataKey || feedback.key === "" ? feedback.message : "";

  useEffect(() => {
    if (!session) return;
    let current = true;
    fetch("/api/v1/workspace/list", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Unable to load workspaces");
        const list = workspaceListSchema.parse(await res.json());
        if (current) {
          setWorkspaces(list.workspaces);
          const initialWorkspace =
            searchParams.get("workspaceId") ??
            list.active ??
            list.workspaces[0]?.id ??
            "";
          setWorkspaceId(initialWorkspace);
          const urlJobId = searchParams.get("jobId");
          if (urlJobId) {
            setJobId(urlJobId);
            setInputJobId(urlJobId);
          }
        }
      })
      .catch(() => {
        if (current)
          setFeedback({
            key: "",
            message: "Unable to load workspaces. Reload to retry.",
          });
      });
    return () => {
      current = false;
    };
  }, [session, searchParams]);

  useEffect(() => {
    if (!workspaceId || !jobId) return;
    let current = true;
    Promise.all([
      fetchBackendOverview(workspaceId, jobId),
      fetchBackendRoutes(workspaceId, jobId),
      fetchBackendControllers(workspaceId, jobId),
      fetchBackendServices(workspaceId, jobId),
      fetchBackendRepositories(workspaceId, jobId),
      fetchBackendMiddleware(workspaceId, jobId),
      fetchBackendRequestFlows(workspaceId, jobId),
    ])
      .then(([ov, r, c, s, repo, mw, f]) => {
        if (current) {
          setOverview(ov);
          setRoutes(r.routes);
          setControllers(c.controllers);
          setServices(s.services);
          setRepositories(repo.repositories);
          setMiddleware(mw.middleware);
          setRequestFlows(f.flows);
          setLoadedKey(dataKey);
          setFeedback({ key: dataKey, message: "" });
        }
      })
      .catch((err) => {
        if (current) {
          setOverview(null);
          setRoutes([]);
          setControllers([]);
          setServices([]);
          setRepositories([]);
          setMiddleware([]);
          setRequestFlows([]);
          setFeedback({
            key: dataKey,
            message:
              err instanceof Error
                ? err.message
                : "Failed to load backend intelligence",
          });
          setLoadedKey(dataKey);
        }
      });

    return () => {
      current = false;
    };
  }, [workspaceId, jobId, dataKey]);

  useEffect(() => {
    if (!workspaceId || !jobId || !selectedRouteId) return;
    let current = true;

    fetchBackendRouteDetail(workspaceId, jobId, selectedRouteId)
      .then((detail) => {
        if (current) {
          setRouteResult({ key: routeKey, detail });
        }
      })
      .catch(() => {
        if (current) {
          setRouteResult({ key: routeKey, detail: null });
        }
      });

    return () => {
      current = false;
    };
  }, [workspaceId, jobId, selectedRouteId, routeKey]);

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputJobId.trim()) return;
    setJobId(inputJobId.trim());
    setSelectedRouteId(null);
  };

  if (isPending) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <p className="text-sm text-zinc-500">Checking authentication…</p>
      </main>
    );
  }

  if (authError || !session) {
    return (
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        <h1 className="text-2xl font-bold">Backend Architecture Explorer</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Sign in required to view backend routes, controllers, and services.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-indigo-600 underline dark:text-indigo-400"
        >
          Sign in to continue
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-zinc-800">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-semibold">
            codaryn
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            <Link
              href="/repositories"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Repositories
            </Link>
            <Link
              href="/studio"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Studio
            </Link>
            <Link
              href="/analysis"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Analysis
            </Link>
            <Link
              href="/graph"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Dependency Graph
            </Link>
            <Link
              href="/frontend"
              className="hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Frontend Explorer
            </Link>
            <Link
              href="/backend"
              className="font-semibold text-indigo-600 dark:text-indigo-400"
            >
              Backend Explorer
            </Link>
          </nav>
        </div>
        <Link
          href="/workspace"
          className="text-sm text-indigo-600 dark:text-indigo-400"
        >
          Workspace settings
        </Link>
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Backend Architecture Intelligence
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Explore Express, Fastify, and NestJS routes,
          controller/service/repository layers, middleware guards, and
          end-to-end request flows.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form
          onSubmit={handleLookup}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="be-workspace-select"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Workspace
            </label>
            <select
              id="be-workspace-select"
              value={workspaceId}
              onChange={(e) => {
                setWorkspaceId(e.target.value);
                setSelectedRouteId(null);
              }}
              className={control}
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
            <label
              htmlFor="be-job-input"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Analysis Job ID
            </label>
            <input
              id="be-job-input"
              type="text"
              placeholder="Enter analysis job UUID…"
              value={inputJobId}
              onChange={(e) => setInputJobId(e.target.value)}
              className={control}
            />
          </div>

          <button
            type="submit"
            disabled={busy || !inputJobId.trim()}
            className={button}
          >
            {busy ? "Loading…" : "Inspect Backend"}
          </button>
        </form>

        {message && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            {message}
          </div>
        )}
      </div>

      {overview && !busy && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
              HTTP Routes
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.totalRoutes}
            </span>
            <span className="text-[10px] text-zinc-400 capitalize">
              {overview.detectedFrameworks.length > 0
                ? overview.detectedFrameworks.join(", ")
                : "None"}
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
              Controllers
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.totalControllers}
            </span>
            <span className="text-[10px] text-zinc-400">Presentation</span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
              Services
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.totalServices}
            </span>
            <span className="text-[10px] text-zinc-400">Business Logic</span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
              Repositories
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.totalRepositories}
            </span>
            <span className="text-[10px] text-zinc-400">Persistence / ORM</span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
              Middleware
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.totalMiddleware}
            </span>
            <span className="text-[10px] text-zinc-400">
              Guards &amp; Validation
            </span>
          </div>

          <div className="flex flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <span className="text-[11px] font-medium tracking-wider text-zinc-500 uppercase">
              Request Flows
            </span>
            <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {overview.totalRequestFlows}
            </span>
            <span className="text-[10px] text-zinc-400">E2E Traces</span>
          </div>
        </div>
      )}

      {selectedRouteId && (
        <EndpointDetail
          detail={routeDetail}
          loading={detailLoading}
          onClose={() => setSelectedRouteId(null)}
        />
      )}

      {jobId && !busy && (
        <div className="flex flex-col gap-4">
          <div className="flex border-b border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab("endpoints")}
              className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === "endpoints"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Endpoint Inventory ({routes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("architecture")}
              className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === "architecture"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Layers &amp; DI (
              {controllers.length + services.length + repositories.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("middleware")}
              className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === "middleware"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Middleware &amp; Guards ({middleware.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("flows")}
              className={`border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                activeTab === "flows"
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              Request Lifecycles ({requestFlows.length})
            </button>
          </div>

          {activeTab === "endpoints" && (
            <EndpointInventory
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
            />
          )}

          {activeTab === "architecture" && (
            <ControllerServiceView
              controllers={controllers}
              services={services}
              repositories={repositories}
            />
          )}

          {activeTab === "middleware" && (
            <MiddlewareChainView middleware={middleware} />
          )}

          {activeTab === "flows" && (
            <RequestLifecycleView
              flows={requestFlows}
              onSelectRoute={(id) => setSelectedRouteId(id)}
            />
          )}
        </div>
      )}
    </main>
  );
}

export default function BackendPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
          <p className="text-sm text-zinc-500">Loading backend explorer…</p>
        </main>
      }
    >
      <BackendDashboard />
    </Suspense>
  );
}
