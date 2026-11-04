"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  workspaceListSchema,
  type FrontendComponent,
  type FrontendComponentDetailResponse,
  type FrontendContext,
  type FrontendHookCall,
  type FrontendOverviewResponse,
  type FrontendRoute,
  type FrontendState,
  type FrontendApiClientCall,
  type WorkspaceSummary,
} from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { control, button } from "@/src/features/repositories/api";
import {
  fetchFrontendOverview,
  fetchFrontendComponents,
  fetchFrontendComponentDetail,
  fetchFrontendRoutes,
  fetchFrontendHooks,
  fetchFrontendContexts,
  fetchFrontendState,
  fetchFrontendApiClients,
  ComponentHierarchy,
  RoutesView,
  HooksStateView,
  ContextsView,
  ApiClientsView,
  ComponentDetail,
} from "@/src/features/frontend-explorer";

function FrontendDashboard() {
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

  const [overview, setOverview] = useState<FrontendOverviewResponse | null>(
    null,
  );
  const [components, setComponents] = useState<FrontendComponent[]>([]);
  const [routes, setRoutes] = useState<FrontendRoute[]>([]);
  const [hooks, setHooks] = useState<FrontendHookCall[]>([]);
  const [contexts, setContexts] = useState<FrontendContext[]>([]);
  const [state, setState] = useState<FrontendState[]>([]);
  const [apiCalls, setApiCalls] = useState<FrontendApiClientCall[]>([]);

  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(
    null,
  );
  const [componentDetail, setComponentDetail] =
    useState<FrontendComponentDetailResponse | null>(null);

  const [activeTab, setActiveTab] = useState<
    "components" | "routes" | "hooks" | "contexts" | "api"
  >("components");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
        if (current) setMessage("Unable to load workspaces. Reload to retry.");
      });
    return () => {
      current = false;
    };
  }, [session, searchParams]);

  useEffect(() => {
    if (!workspaceId || !jobId) return;
    let current = true;

    Promise.all([
      fetchFrontendOverview(workspaceId, jobId),
      fetchFrontendComponents(workspaceId, jobId),
      fetchFrontendRoutes(workspaceId, jobId),
      fetchFrontendHooks(workspaceId, jobId),
      fetchFrontendContexts(workspaceId, jobId),
      fetchFrontendState(workspaceId, jobId),
      fetchFrontendApiClients(workspaceId, jobId),
    ])
      .then(([ov, comps, rts, hks, ctxs, st, apis]) => {
        if (current) {
          setOverview(ov);
          setComponents(comps.components);
          setRoutes(rts.routes);
          setHooks(hks.hooks);
          setContexts(ctxs.contexts);
          setState(st.state);
          setApiCalls(apis.apiCalls);
        }
      })
      .catch((err) => {
        if (current) {
          setMessage(
            err instanceof Error
              ? err.message
              : "Failed to load frontend architecture data.",
          );
        }
      });

    return () => {
      current = false;
    };
  }, [workspaceId, jobId]);

  useEffect(() => {
    if (!workspaceId || !jobId || !selectedComponentId) {
      setComponentDetail(null);
      return;
    }
    let current = true;

    fetchFrontendComponentDetail(workspaceId, jobId, selectedComponentId)
      .then((detail) => {
        if (current) setComponentDetail(detail);
      })
      .catch(() => {
        if (current) setComponentDetail(null);
      });

    return () => {
      current = false;
    };
  }, [workspaceId, jobId, selectedComponentId]);

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!inputJobId.trim()) return;
    setBusy(true);
    setJobId(inputJobId.trim());
    setSelectedComponentId(null);
    setComponentDetail(null);
    setMessage("");
    setBusy(false);
  }

  function handleSelectComponent(compId: string) {
    setSelectedComponentId(compId);
    window.scrollTo({ top: 350, behavior: "smooth" });
  }

  if (isPending) {
    return (
      <output className="block p-8">Loading frontend intelligence…</output>
    );
  }

  if (authError) {
    return (
      <p role="alert" className="p-8">
        Unable to verify your session. Reload to retry.
      </p>
    );
  }

  if (!session) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="text-2xl font-semibold">
          Frontend Architecture Intelligence
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Sign in to inspect React component hierarchies, route maps, hooks, and
          state management patterns.
        </p>
        <Link
          href="/workspace"
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
              className="font-semibold text-indigo-600 dark:text-indigo-400"
            >
              Frontend Explorer
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
          Frontend Architecture Intelligence
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Explore React components, JSX rendering hierarchies, hooks, state
          stores, App/Pages routers, and API clients with source evidence.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <form
          onSubmit={handleLookup}
          className="flex flex-wrap items-end gap-3"
        >
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="fe-workspace-select"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Workspace
            </label>
            <select
              id="fe-workspace-select"
              value={workspaceId}
              onChange={(e) => setWorkspaceId(e.target.value)}
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
              htmlFor="fe-job-input"
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            >
              Analysis Job ID
            </label>
            <input
              id="fe-job-input"
              type="text"
              placeholder="e.g. 1a2b3c4d-..."
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
            {busy ? "Loading…" : "Inspect Frontend"}
          </button>
        </form>

        {message && (
          <p
            role="status"
            className="rounded-lg bg-zinc-100 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {message}
          </p>
        )}
      </div>

      {overview && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-xs text-zinc-500">Components</span>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {overview.totalComponents}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-xs text-zinc-500">Routes &amp; Pages</span>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {overview.totalRoutes}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-xs text-zinc-500">Hook References</span>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {overview.totalHooks}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-xs text-zinc-500">Context Providers</span>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {overview.totalContexts}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <span className="text-xs text-zinc-500">API Calls</span>
              <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {overview.totalApiClients}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Frameworks:
              </span>
              {overview.detectedFrameworks.length > 0 ? (
                overview.detectedFrameworks.map((fw) => (
                  <span
                    key={fw}
                    className="rounded bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                  >
                    {fw}
                  </span>
                ))
              ) : (
                <span className="text-zinc-500">React Generic</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                State Patterns:
              </span>
              {overview.stateManagementPatterns.length > 0 ? (
                overview.stateManagementPatterns.map((pat) => (
                  <span
                    key={pat}
                    className="rounded bg-zinc-200 px-2 py-0.5 font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {pat}
                  </span>
                ))
              ) : (
                <span className="text-zinc-500">None detected</span>
              )}
            </div>
          </div>

          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <nav className="flex gap-6">
              <button
                type="button"
                onClick={() => setActiveTab("components")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "components"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                Components ({components.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("routes")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "routes"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                Routes ({routes.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("hooks")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "hooks"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                Hooks &amp; State ({hooks.length + state.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("contexts")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "contexts"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                Contexts ({contexts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("api")}
                className={`border-b-2 pb-3 text-sm font-medium ${
                  activeTab === "api"
                    ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                API Clients ({apiCalls.length})
              </button>
            </nav>
          </div>

          {componentDetail && (
            <ComponentDetail
              detail={componentDetail}
              onClose={() => {
                setSelectedComponentId(null);
                setComponentDetail(null);
              }}
              onSelectComponent={handleSelectComponent}
            />
          )}

          {activeTab === "components" && (
            <ComponentHierarchy
              components={components}
              selectedComponentId={selectedComponentId}
              onSelectComponent={handleSelectComponent}
            />
          )}

          {activeTab === "routes" && (
            <RoutesView
              routes={routes}
              onSelectComponent={handleSelectComponent}
            />
          )}

          {activeTab === "hooks" && (
            <HooksStateView
              hooks={hooks}
              state={state}
              onSelectComponent={handleSelectComponent}
            />
          )}

          {activeTab === "contexts" && (
            <ContextsView
              contexts={contexts}
              onSelectComponent={handleSelectComponent}
            />
          )}

          {activeTab === "api" && (
            <ApiClientsView
              apiCalls={apiCalls}
              onSelectComponent={handleSelectComponent}
            />
          )}
        </div>
      )}

      {!overview && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 p-12 text-center dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No active frontend intelligence selected
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Enter an analysis Job ID above to inspect React component
            hierarchies, routes, hooks, state stores, and network client calls.
          </p>
        </div>
      )}
    </main>
  );
}

export default function FrontendPage() {
  return (
    <Suspense
      fallback={
        <output className="block p-8">Loading frontend dashboard…</output>
      }
    >
      <FrontendDashboard />
    </Suspense>
  );
}
