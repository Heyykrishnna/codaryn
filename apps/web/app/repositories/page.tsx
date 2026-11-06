"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  githubConfigurationSchema,
  githubInstallationListSchema,
  repositoryListSchema,
  workspaceListSchema,
  type WorkspaceSummary,
} from "@codaryn/contracts";
import { RepositoryDetails } from "@/src/features/repositories/details";
import {
  api,
  button,
  control,
  type Repository,
} from "@/src/features/repositories/api";
import { authClient } from "@/src/lib/auth-client";
import { LoaderOrb } from "@/src/components/ui/loader-orb";

function Repositories() {
  const {
    data: session,
    isPending,
    error: sessionError,
  } = authClient.useSession();
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [configuration, setConfiguration] = useState<{
    enabled: boolean;
    installationUrl: string | null;
  } | null>(null);
  const [installations, setInstallations] = useState<
    { id: string; connected: boolean }[]
  >([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selected, setSelected] = useState<Repository | null>(null);
  const [filter, setFilter] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!session) return;
    let current = true;
    Promise.all([
      fetch("/api/v1/workspace/list", { cache: "no-store" }).then(
        (response) => {
          if (!response.ok) throw new Error("Workspaces unavailable");
          return response.json();
        },
      ),
      api("configuration", {}),
    ])
      .then(([rawWorkspaces, rawConfiguration]) => {
        const list = workspaceListSchema.parse(rawWorkspaces);
        if (current) {
          setWorkspaces(list.workspaces);
          setWorkspaceId(list.active ?? list.workspaces[0]?.id ?? "");
          setConfiguration(githubConfigurationSchema.parse(rawConfiguration));
        }
      })
      .catch(() => {
        if (current)
          setMessage("Unable to load GitHub settings. Reload to retry.");
      });
    return () => {
      current = false;
    };
  }, [session]);
  const refresh = useCallback(async () => {
    const [repos, links] = await Promise.all([
      api("repositories", { workspaceId, page: String(page) }),
      api("installations", { workspaceId }),
    ]);
    return {
      repositories: repositoryListSchema.parse(repos).repositories,
      installations: githubInstallationListSchema.parse(links).installations,
    };
  }, [workspaceId, page]);
  useEffect(() => {
    if (!workspaceId || !configuration?.enabled) return;
    let current = true;
    refresh()
      .then((result) => {
        if (current) {
          setRepositories(result.repositories);
          setInstallations(result.installations);
        }
      })
      .catch(() => {
        if (current)
          setMessage("Unable to load repositories. Check access and retry.");
      });
    return () => {
      current = false;
    };
  }, [workspaceId, configuration, refresh]);
  async function run(operation: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
      const next = await refresh();
      setRepositories(next.repositories);
      setInstallations(next.installations);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  function choose(repository: Repository) {
    setSelected(repository);
  }
  const canManage = ["owner", "admin"].includes(
    workspaces.find((workspace) => workspace.id === workspaceId)?.role ?? "",
  );
  const visible = repositories.filter(
    (repository) =>
      repository.fullName.toLowerCase().includes(filter.toLowerCase()) &&
      (visibility === "all" ||
        (visibility === "private") === repository.private),
  );
  if (isPending)
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <LoaderOrb label="Authenticating session…" />
      </div>
    );
  if (sessionError)
    return (
      <main className="p-8 text-xs text-red-300" role="alert">
        Unable to verify your session. Reload to retry.
      </main>
    );
  if (!session)
    return (
      <main className="mx-auto max-w-xl rounded-2xl border border-dotted border-zinc-800 bg-[#111216] p-8 text-center">
        <h1 className="text-xl font-semibold text-white">
          Connect your repositories
        </h1>
        <p className="mt-2 text-xs text-zinc-400">
          Sign in to your account to inspect, sync, and analyze Git
          repositories.
        </p>
        <Link
          className="mt-4 inline-flex items-center justify-center rounded-lg border border-dotted border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-semibold tracking-wider text-white uppercase hover:bg-zinc-700"
          href="/workspace"
        >
          Sign in to continue
        </Link>
      </main>
    );
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-dotted border-zinc-800 pb-4">
        <Link href="/" className="font-mono text-lg font-bold text-white">
          codaryn
        </Link>
        <Link
          href="/workspace"
          className="text-xs text-zinc-400 transition-colors hover:text-white"
        >
          Workspace settings
        </Link>
      </header>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Repositories
        </h1>
        <p className="text-xs text-zinc-400">
          Sync GitHub repositories, discover branches, and dispatch static AST
          analysis runs.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <Link
          href="/studio"
          className="rounded-md border border-dotted border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          Analysis Studio
        </Link>
        <Link
          href="/analysis"
          className="rounded-md border border-dotted border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          Static Analysis Dashboard
        </Link>
        <Link
          href="/graph"
          className="rounded-md border border-dotted border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          Dependency Graph
        </Link>
        <Link
          href="/frontend"
          className="rounded-md border border-dotted border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          Frontend Explorer
        </Link>
        <Link
          href="/backend"
          className="rounded-md border border-dotted border-zinc-800 bg-zinc-900/60 px-2.5 py-1 text-zinc-300 hover:border-zinc-600 hover:text-white"
        >
          Backend Explorer
        </Link>
      </div>
      {busy && (
        <div className="flex items-center justify-center py-2">
          <LoaderOrb
            variant="inline"
            label="Synchronizing repository telemetry…"
          />
        </div>
      )}
      {message && (
        <div
          role="alert"
          className="rounded-lg border border-dotted border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-300"
        >
          {message}
        </div>
      )}
      {workspaces.length === 0 ? (
        <Link
          href="/workspace"
          className="text-xs text-zinc-400 hover:text-white"
        >
          Create a workspace first
        </Link>
      ) : (
        <label className="flex flex-col gap-1.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          <span>Workspace</span>
          <select
            className={control}
            value={workspaceId}
            disabled={busy}
            onChange={(event) => {
              setWorkspaceId(event.target.value);
              setSelected(null);
              setRepositories([]);
              setInstallations([]);
              setPage(1);
            }}
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {configuration && !configuration.enabled && (
        <section className="flex flex-col gap-3 rounded-2xl border border-dotted border-zinc-800 bg-[#111216] p-6 text-xs text-zinc-300">
          <h2 className="text-sm font-semibold text-white">
            Set up GitHub repository access
          </h2>
          <p className="text-zinc-400">
            You are signed in. Repository access requires a separate GitHub App
            installation with permission to read the repositories you select.
          </p>
          <p className="text-zinc-500">
            Configure GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_PRIVATE_KEY and
            GITHUB_WEBHOOK_SECRET in the API environment, then restart the API.
            Use the same App ID and private key for the ingestion worker.
          </p>
          <a
            className="text-zinc-300 underline transition-colors hover:text-white"
            href="https://github.com/settings/apps/new"
            target="_blank"
            rel="noreferrer"
          >
            Create a GitHub App
          </a>
          <button
            type="button"
            className={button}
            onClick={() => window.location.reload()}
          >
            Check configuration again
          </button>
        </section>
      )}
      {configuration?.enabled && workspaceId && (
        <>
          <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-zinc-800 bg-[#111216] p-6 text-xs text-zinc-300">
            <h2 className="text-sm font-semibold text-white">
              GitHub connections
            </h2>
            {canManage && (
              <>
                <a
                  className="text-zinc-400 underline transition-colors hover:text-white"
                  href={configuration.installationUrl ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                >
                  Install or configure the GitHub App
                </a>
                <p className="text-zinc-400">
                  After installation, enter the installation ID from the
                  callback URL or GitHub installation settings. Your GitHub
                  ownership is verified before linking.
                </p>
                <form
                  className="flex flex-wrap gap-3"
                  action={async (form) => {
                    await run(() =>
                      api(
                        "connect",
                        {
                          workspaceId,
                          installationId: String(form.get("installationId")),
                        },
                        true,
                      ),
                    );
                  }}
                >
                  <input
                    aria-label="Installation ID"
                    name="installationId"
                    defaultValue={searchParams.get("installation_id") ?? ""}
                    inputMode="numeric"
                    required
                    pattern="[0-9]+"
                    className={control}
                  />
                  <button type="submit" className={button} disabled={busy}>
                    Connect and sync repositories
                  </button>
                </form>
              </>
            )}
            {installations.length === 0 && (
              <p className="text-zinc-500">No installations connected.</p>
            )}
            {installations.map((installation) => (
              <div
                key={installation.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-dotted border-zinc-800 bg-zinc-900/40 p-3"
              >
                <span className="font-mono text-zinc-300">
                  Installation {installation.id} ·{" "}
                  {installation.connected ? "Connected" : "Disconnected"}
                </span>
                {canManage && (
                  <>
                    <button
                      type="button"
                      className={button}
                      disabled={busy || !installation.connected}
                      onClick={async () => {
                        await run(() =>
                          api(
                            "sync",
                            { workspaceId, installationId: installation.id },
                            true,
                          ),
                        );
                      }}
                    >
                      Sync repositories
                    </button>
                    <button
                      type="button"
                      className={button}
                      disabled={busy || !installation.connected}
                      onClick={async () => {
                        if (
                          window.confirm(
                            "Disconnect this installation from the workspace?",
                          )
                        )
                          await run(async () => {
                            await api(
                              "disconnect",
                              { workspaceId, installationId: installation.id },
                              true,
                            );
                            setSelected(null);
                          });
                      }}
                    >
                      Disconnect
                    </button>
                  </>
                )}
              </div>
            ))}
          </section>
          <div className="flex flex-wrap gap-3">
            <input
              className={control}
              aria-label="Search current page"
              placeholder="Search this page"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <select
              aria-label="Repository visibility"
              className={control}
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
            >
              <option value="all">All visibility</option>
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
            <select
              aria-label="Repository view"
              className={control}
              value={view}
              onChange={(event) => setView(event.target.value)}
            >
              <option value="grid">Grid</option>
              <option value="table">Table</option>
            </select>
          </div>
          {visible.length === 0 && (
            <p className="text-xs text-zinc-500">
              No repositories match this page. Sync a connected installation to
              discover repositories.
            </p>
          )}
          {view === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {visible.map((repository) => (
                <button
                  type="button"
                  className="group rounded-xl border border-dotted border-zinc-800 bg-[#121318] p-5 text-left transition-all duration-200 hover:border-zinc-500 hover:bg-zinc-900/60 focus-visible:ring-1 focus-visible:ring-zinc-400 focus-visible:outline-none disabled:opacity-50"
                  key={repository.id}
                  disabled={busy}
                  onClick={() => {
                    choose(repository);
                  }}
                >
                  <span className="block font-medium break-all text-white group-hover:text-zinc-200">
                    {repository.fullName}
                  </span>
                  <span className="mt-2 block font-mono text-xs text-zinc-400">
                    {repository.private ? "Private" : "Public"} ·{" "}
                    {repository.defaultBranch}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-dotted border-zinc-800 bg-[#121318]">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-dotted border-zinc-800 text-zinc-400">
                    <th className="p-3 font-semibold tracking-wider uppercase">
                      Repository
                    </th>
                    <th className="p-3 font-semibold tracking-wider uppercase">
                      Visibility
                    </th>
                    <th className="p-3 font-semibold tracking-wider uppercase">
                      Default branch
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((repository) => (
                    <tr
                      key={repository.id}
                      className="border-b border-dotted border-zinc-800/80 hover:bg-zinc-900/40"
                    >
                      <td className="p-3">
                        <button
                          type="button"
                          className="font-mono text-zinc-200 transition-colors hover:text-white"
                          disabled={busy}
                          onClick={() => {
                            choose(repository);
                          }}
                        >
                          {repository.fullName}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-zinc-400">
                        {repository.private ? "Private" : "Public"}
                      </td>
                      <td className="p-3 font-mono text-zinc-400">
                        {repository.defaultBranch}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className={button}
              disabled={busy || page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous page
            </button>
            <span className="self-center font-mono text-xs text-zinc-400">
              Page {page}
            </span>
            <button
              type="button"
              className={button}
              disabled={busy || repositories.length < 50}
              onClick={() => setPage(page + 1)}
            >
              Next page
            </button>
          </div>
          {selected && (
            <RepositoryDetails
              key={`${workspaceId}:${selected.id}`}
              selected={selected}
              workspaceId={workspaceId}
            />
          )}
        </>
      )}
    </main>
  );
}
export default function RepositoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center p-8">
          <LoaderOrb label="Loading repositories…" />
        </div>
      }
    >
      <Repositories />
    </Suspense>
  );
}
