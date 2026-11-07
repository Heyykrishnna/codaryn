"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  githubConfigurationSchema,
  githubInstallationListSchema,
  type WorkspaceSummary,
} from "@codaryn/contracts";
import { RepositoryDetails } from "@/src/features/repositories/details";
import {
  api,
  fetchRepositoryCatalog,
  button,
  control,
  type Repository,
} from "@/src/features/repositories/api";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { DashboardPage } from "@/src/components/dashboard-page";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { useArtifactResource } from "@/src/lib/artifact-resource";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";

function RepositoryManager({ workspace }: { workspace: WorkspaceSummary }) {
  const workspaceId = workspace.id;
  const searchParams = useSearchParams();
  const settings = useArtifactResource(
    "/api/v1/github/configuration",
    githubConfigurationSchema,
  );
  const configuration = settings.data;
  const [installations, setInstallations] = useState<
    { id: string; connected: boolean }[]
  >([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selected, setSelected] = useState<Repository | null>(null);
  const inspector = useRef<HTMLElement>(null);
  const inspectorTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!selected) return;
    inspector.current?.focus({ preventScroll: true });
    inspector.current?.scrollIntoView({ block: "nearest" });
  }, [selected]);
  const [filter, setFilter] = useState("");
  const [visibility, setVisibility] = useState("all");
  const [view, setView] = useState("grid");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [settled, setSettled] = useState(false);
  const [loadError, setLoadError] = useState("");
  const loading = configuration?.enabled && !settled;
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const [repos, links] = await Promise.all([
        fetchRepositoryCatalog(
          workspaceId,
          signal ?? AbortSignal.timeout(30000),
        ),
        api("installations", { workspaceId }, false, signal),
      ]);
      return {
        repositories: repos,
        installations: githubInstallationListSchema.parse(links).installations,
      };
    },
    [workspaceId],
  );
  useEffect(() => {
    if (!workspaceId || !configuration?.enabled) return;
    const controller = new AbortController();
    refresh(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRepositories(result.repositories);
        setInstallations(result.installations);
        setLoadError("");
        setSettled(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRepositories([]);
        setInstallations([]);
        setLoadError(
          "Unable to load repositories. Check access and reload to retry.",
        );
        setSettled(true);
      });
    return () => controller.abort();
  }, [configuration?.enabled, refresh, workspaceId]);
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
  function choose(repository: Repository, trigger: HTMLButtonElement) {
    inspectorTrigger.current = trigger;
    setSelected(repository);
  }
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const visible = repositories.filter(
    (repository) =>
      repository.fullName.toLowerCase().includes(filter.toLowerCase()) &&
      (visibility === "all" ||
        (visibility === "private") === repository.private),
  );
  if (settings.loading)
    return <LoadingIndicator label="Loading GitHub settings…" />;
  if (settings.error)
    return (
      <p role="alert" className="text-muted text-sm">
        {settings.error}
      </p>
    );

  return (
    <>
      {busy && (
        <div className="flex items-center justify-center py-2">
          <LoadingIndicator
            variant="inline"
            label="Updating repository connections…"
          />
        </div>
      )}
      {message && (
        <div
          role="alert"
          className="rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-2 font-mono text-xs text-neutral-900"
        >
          {message}
        </div>
      )}
      {configuration && !configuration.enabled && (
        <section className="flex flex-col gap-3 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 text-xs text-neutral-900">
          <h2 className="text-sm font-semibold text-neutral-950">
            Set up GitHub repository access
          </h2>
          <p className="text-neutral-600">
            You are signed in. Repository access requires a separate GitHub App
            installation with permission to read the repositories you select.
          </p>
          <p className="text-neutral-600">
            Configure GITHUB_APP_ID, GITHUB_APP_SLUG, GITHUB_APP_PRIVATE_KEY and
            GITHUB_WEBHOOK_SECRET in the API environment, then restart the API.
            Use the same App ID and private key for the ingestion worker.
          </p>
          <a
            className="text-neutral-900 underline transition-colors hover:text-neutral-950"
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
      {configuration?.enabled && (
        <>
          <details
            open={
              searchParams.has("installation_id") ||
              (!loading &&
                !loadError &&
                !installations.some((item) => item.connected))
            }
            className="group border-border bg-card rounded-xl border border-dotted text-sm"
          >
            <summary className="hover:bg-card-hover flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-2 font-medium focus-visible:outline-2 focus-visible:-outline-offset-2 [&::-webkit-details-marker]:hidden">
              GitHub connections
              <svg
                aria-hidden="true"
                className="text-muted size-4 shrink-0 group-open:rotate-180 motion-safe:transition-transform"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className="border-border flex flex-col gap-4 border-t border-dotted px-4 py-4">
              {canManage && (
                <>
                  <a
                    className="text-neutral-600 underline transition-colors hover:text-neutral-950"
                    href={configuration.installationUrl ?? undefined}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Install or configure the GitHub App
                  </a>
                  <p className="text-neutral-600">
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
                    <button
                      type="submit"
                      className={button}
                      disabled={busy || loading}
                    >
                      Connect and sync repositories
                    </button>
                  </form>
                </>
              )}
              {!loading && !loadError && installations.length === 0 && (
                <p className="text-neutral-600">No installations connected.</p>
              )}
              {!loading &&
                installations.map((installation) => (
                  <div
                    key={installation.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-dotted border-neutral-300 bg-white/40 p-3"
                  >
                    <span className="font-mono text-neutral-900">
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
                                {
                                  workspaceId,
                                  installationId: installation.id,
                                },
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
                                  {
                                    workspaceId,
                                    installationId: installation.id,
                                  },
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
            </div>
          </details>
          <div className="border-border flex flex-wrap items-end gap-3 border-b border-dotted pb-4">
            <div className="w-full min-w-0 sm:flex-1 sm:basis-48">
              <label
                htmlFor="repository-search"
                className="text-muted mb-1.5 block text-sm"
              >
                Find a repository
              </label>
              <input
                id="repository-search"
                type="search"
                className={`${control} w-full`}
                placeholder="Search all repositories"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </div>
            <DropdownSelect
              label="Repository visibility"
              className="w-36"
              value={visibility}
              onChange={setVisibility}
              options={[
                { value: "all", label: "All visibility" },
                { value: "private", label: "Private" },
                { value: "public", label: "Public" },
              ]}
            />
            <DropdownSelect
              label="Repository view"
              className="w-28"
              value={view}
              onChange={setView}
              options={[
                { value: "grid", label: "Grid" },
                { value: "table", label: "Table" },
              ]}
            />
          </div>
          {selected && (
            <section
              ref={inspector}
              tabIndex={-1}
              aria-label="Selected repository"
              className="scroll-mt-44 space-y-3 lg:scroll-mt-6"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-medium">Repository details</h2>
                <button
                  type="button"
                  className={control}
                  onClick={() => {
                    setSelected(null);
                    inspectorTrigger.current?.focus();
                  }}
                >
                  Close details
                </button>
              </div>
              <RepositoryDetails
                key={`${workspaceId}:${selected.id}`}
                selected={selected}
                workspaceId={workspaceId}
              />
            </section>
          )}
          {loading && (
            <LoadingIndicator label="Loading repositories and connections…" />
          )}
          {!loading && loadError && (
            <p role="alert" className="text-muted text-sm">
              {loadError}
            </p>
          )}
          {!loading && !loadError && visible.length === 0 && (
            <p className="text-xs text-neutral-600">
              {repositories.length > 0
                ? "No repositories match these filters. Try another search."
                : "No repositories found. Sync a connected installation to discover repositories."}
            </p>
          )}
          {!loading &&
            !loadError &&
            visible.length > 0 &&
            (view === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {visible.map((repository) => (
                  <button
                    type="button"
                    className="group motion-safe:ease-control hover:bg-card-hover rounded-xl border border-dotted border-neutral-300 bg-white p-5 text-left hover:border-neutral-400 focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:outline-none disabled:opacity-50 motion-safe:transition-[background-color,border-color,color,translate,scale,box-shadow] motion-safe:duration-200 motion-safe:active:translate-y-px"
                    key={repository.id}
                    disabled={busy}
                    onClick={(event) => {
                      choose(repository, event.currentTarget);
                    }}
                  >
                    <span className="block font-medium break-all text-neutral-950 group-hover:text-neutral-900">
                      {repository.fullName}
                    </span>
                    <span className="text-muted mt-2 block text-xs">
                      {repository.private ? "Private" : "Public"} ·{" "}
                      {repository.defaultBranch}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-dotted border-neutral-300 bg-white">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-dotted border-neutral-300 text-neutral-600">
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
                        className="border-b border-dotted border-neutral-300/80 hover:bg-white/40"
                      >
                        <td className="p-3">
                          <button
                            type="button"
                            className="font-mono text-neutral-900 transition-colors hover:text-neutral-950"
                            disabled={busy}
                            onClick={(event) => {
                              choose(repository, event.currentTarget);
                            }}
                          >
                            {repository.fullName}
                          </button>
                        </td>
                        <td className="p-3 font-mono text-neutral-600">
                          {repository.private ? "Private" : "Public"}
                        </td>
                        <td className="p-3 font-mono text-neutral-600">
                          {repository.defaultBranch}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          {!loading && !loadError && (
            <p className="text-muted text-sm">
              {visible.length} of {repositories.length} repositories
            </p>
          )}
        </>
      )}
    </>
  );
}
export default function RepositoryPage() {
  return (
    <Suspense
      fallback={
        <DashboardPage>
          <LoadingIndicator label="Loading repositories…" />
        </DashboardPage>
      }
    >
      <WorkspaceExplorer
        title="Repositories"
        description="Connect GitHub, browse synced repositories, and select a revision to analyze."
      >
        {(workspaceId, workspace) => (
          <RepositoryManager key={workspaceId} workspace={workspace} />
        )}
      </WorkspaceExplorer>
    </Suspense>
  );
}
