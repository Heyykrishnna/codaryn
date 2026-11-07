"use client";

import Link from "next/link";
import { RepositoryStep, RevisionStep, ProfileStep } from "./source-steps";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  branchListSchema,
  commitListSchema,
  normalizeStudioConfiguration,
  analysisJobSummarySchema,
  studioConfigurationSchema,
  studioDefaults,
  studioManifestResponseSchema,
  studioProfileListSchema,
  type StudioConfiguration,
  type WorkspaceSummary,
  type StudioManifestResponse,
} from "@codaryn/contracts";
import {
  api,
  fetchRepositoryCatalog,
  type Repository,
} from "@/src/features/repositories/api";
import { analysisRequest } from "@/src/features/analysis/api";
import { studioRequest } from "./api";
import { ModuleSelection } from "./selections";
import { CandyButton } from "@/src/components/ui/candy-button";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import { cn } from "@/lib/utils";

const steps = [
  "Repository",
  "Branch and commit",
  "Analysis profile",
  "Frontend analyzers",
  "Backend analyzers",
  "Database analyzers",
  "Infrastructure analyzers",
  "Analysis depth",
  "Exclusions",
  "Diagrams",
  "Documents",
  "Review and start",
];

type Profile = z.infer<typeof studioProfileListSchema>["profiles"][number];

export function Studio({
  workspace,
}: Readonly<{ workspace: WorkspaceSummary }>) {
  const [step, setStep] = useState(0);
  const [configuration, setConfiguration] =
    useState<StudioConfiguration>(studioDefaults);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryId, setRepositoryId] = useState("");
  const [branches, setBranches] = useState<{ name: string; sha: string }[]>([]);
  const [branch, setBranch] = useState("");
  const [branchPage, setBranchPage] = useState(1);
  const [commits, setCommits] = useState<{ sha: string; message: string }[]>(
    [],
  );
  const [commitPage, setCommitPage] = useState(1);
  const [commit, setCommit] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilePage, setProfilePage] = useState(1);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [manifest, setManifest] = useState<StudioManifestResponse | null>(null);
  const [analysis, setAnalysis] = useState<{
    manifestId: string;
    jobId: string;
  } | null>(null);
  const [history, setHistory] = useState<StudioManifestResponse[]>([]);
  const [settledSource, setSettledSource] = useState("");
  const [settledBranches, setSettledBranches] = useState("");
  const [settledCommits, setSettledCommits] = useState("");
  const sourceKey = String(profilePage);
  const branchKey = JSON.stringify([repositoryId, branchPage]);
  const commitKey = JSON.stringify([repositoryId, branch, commitPage]);
  const sourceLoading = settledSource !== sourceKey;
  const branchesLoading = !!repositoryId && settledBranches !== branchKey;
  const commitsLoading =
    !!repositoryId && !!branch && settledCommits !== commitKey;
  const stepLoading =
    ((step === 0 || step === 2) && sourceLoading) ||
    (step === 1 && (branchesLoading || commitsLoading));
  const manage = workspace.role !== "member";

  let preview: StudioConfiguration | null = null;
  let validation = "";
  try {
    preview = normalizeStudioConfiguration({
      ...configuration,
      exclusions: configuration.exclusions
        .map((item) => item.trim())
        .filter(Boolean),
    });
  } catch (error) {
    validation =
      error instanceof Error ? error.message : "Invalid configuration";
  }

  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    Promise.all([
      fetchRepositoryCatalog(workspace.id, controller.signal),
      studioRequest("profiles", workspace.id, { page: profilePage }),
      studioRequest("manifests", workspace.id),
    ])
      .then(([rawRepos, rawProfiles, rawHistory]) => {
        const repos = rawRepos;
        const saved = studioProfileListSchema.parse(rawProfiles).profiles;
        const past = z
          .object({ manifests: z.array(studioManifestResponseSchema) })
          .parse(rawHistory).manifests;
        if (current) {
          setRepositories(repos);
          setProfiles(saved);
          setHistory(past);
        }
      })
      .catch(() => {
        if (current)
          setMessage(
            "Unable to load studio data. Verify the GitHub connection and reload to retry.",
          );
      })
      .finally(() => {
        if (current) setSettledSource(sourceKey);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [workspace.id, profilePage, sourceKey]);

  useEffect(() => {
    if (!repositoryId) return;
    let current = true;
    api("branches", {
      workspaceId: workspace.id,
      repositoryId,
      page: String(branchPage),
    })
      .then((raw) => {
        const list = branchListSchema.parse(raw).branches;
        if (current) setBranches(list);
      })
      .catch(() => {
        if (current)
          setMessage("Unable to load branches. Check access and retry.");
      })
      .finally(() => {
        if (current) setSettledBranches(branchKey);
      });
    return () => {
      current = false;
    };
  }, [repositoryId, workspace.id, branchPage, branchKey]);

  useEffect(() => {
    if (!repositoryId || !branch) return;
    let current = true;
    api("commits", {
      workspaceId: workspace.id,
      repositoryId,
      branch,
      page: String(commitPage),
    })
      .then((raw) => {
        const list = commitListSchema.parse(raw).commits;
        if (current) setCommits(list);
      })
      .catch(() => {
        if (current)
          setMessage(
            "Unable to load commits. The repository may be empty or inaccessible.",
          );
      })
      .finally(() => {
        if (current) setSettledCommits(commitKey);
      });
    return () => {
      current = false;
    };
  }, [repositoryId, branch, workspace.id, commitPage, commitKey]);

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Request failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function choosePreset(config: StudioConfiguration) {
    setConfiguration(config);
    setProfile(null);
    setName("");
    setManifest(null);
  }

  async function refreshProfiles() {
    setProfiles(
      studioProfileListSchema.parse(
        await studioRequest("profiles", workspace.id, { page: profilePage }),
      ).profiles,
    );
  }

  async function startAnalysis(selected: StudioManifestResponse) {
    const job = analysisJobSummarySchema.parse(
      await analysisRequest(
        "start",
        workspace.id,
        {
          manifestId: selected.id,
          repositoryId: selected.manifest.repositoryId,
          ref: selected.manifest.commitSha,
          reuseExisting: true,
        },
        true,
      ),
    );
    setAnalysis({ manifestId: selected.id, jobId: job.id });
    setMessage(
      job.status === "completed"
        ? "Analysis is ready. Open Graph to explore the snapshot."
        : "Analysis requested. Track the job in Graph.",
    );
  }

  async function save(update: boolean) {
    const saved = await studioRequest(
      "save",
      workspace.id,
      {
        name,
        configuration: preview,
        ...(update && profile
          ? { id: profile.id, revision: profile.revision }
          : {}),
      },
      true,
    );
    setProfile(studioProfileListSchema.shape.profiles.element.parse(saved));
    await refreshProfiles();
    setMessage("Profile saved.");
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 rounded-xl border border-dotted border-neutral-300 bg-white p-4 text-xs text-neutral-900">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-neutral-950">
            Workspace: {workspace.name} ({workspace.role})
          </span>
          {busy && (
            <LoadingIndicator
              variant="inline"
              label="Executing studio pipeline…"
            />
          )}
        </div>
        <p className="text-neutral-600">
          Configure an immutable static analysis manifest. Analyzers extract
          evidence, AST topology, and API contracts.
        </p>
        {message && (
          <div
            role="alert"
            className="mt-1 rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 font-mono text-xs text-neutral-900"
          >
            {message}
          </div>
        )}
      </div>

      <nav aria-label="Analysis steps" className="flex flex-wrap gap-1.5">
        {steps.map((label, index) => {
          const isCurrent = step === index;
          const isDone = step > index;
          return (
            <button
              type="button"
              key={label}
              aria-current={isCurrent ? "step" : undefined}
              disabled={busy}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all outline-none select-none",
                isCurrent
                  ? "bg-neutral-100 text-neutral-950 shadow-[0_2px_0_0_#a1a1aa]"
                  : isDone
                    ? "border border-dotted border-neutral-300 bg-white text-neutral-900 hover:bg-white"
                    : "border border-dotted border-neutral-300 bg-white text-neutral-600 hover:bg-white hover:text-neutral-900",
              )}
              onClick={() => setStep(index)}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center font-mono text-xs",
                  isCurrent
                    ? "text-neutral-950"
                    : isDone
                      ? "bg-neutral-100 text-neutral-900"
                      : "bg-white text-neutral-600",
                )}
              >
                {isDone ? "✓" : index + 1}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      <section
        aria-label={steps[step]}
        className="flex flex-col gap-6 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-dotted border-neutral-300 bg-neutral-100 font-mono text-xs font-bold text-neutral-900">
              {step + 1}
            </span>
            <h2 tabIndex={-1} className="text-lg font-bold text-neutral-950">
              {steps[step]}
            </h2>
          </div>
          <span className="font-mono text-xs text-neutral-600">
            Step {step + 1} of {steps.length}
          </span>
        </div>

        {stepLoading && (
          <LoadingIndicator
            label={
              step === 1
                ? "Loading branches and commits…"
                : step === 2
                  ? "Loading analysis profiles…"
                  : "Loading repositories…"
            }
          />
        )}
        <fieldset
          disabled={busy || stepLoading}
          className="flex min-w-0 flex-col gap-5"
        >
          {!stepLoading && step === 0 && (
            <RepositoryStep
              {...{
                repositories,
                repositoryId,
                setRepositoryId,
                setBranch,
                setCommit,
                setBranches,
                setCommits,
                setBranchPage,
                setCommitPage,
                setManifest,
              }}
            />
          )}
          {!stepLoading && step === 1 && (
            <RevisionStep
              {...{
                repositoryId,
                branch,
                branches,
                branchPage,
                commits,
                commit,
                commitPage,
                setBranch,
                setCommit,
                setCommits,
                setCommitPage,
                setBranchPage,
              }}
            />
          )}
          {!stepLoading && step === 2 && (
            <ProfileStep
              {...{
                profiles,
                profile,
                profilePage,
                setProfile,
                setName,
                setConfiguration,
                setProfilePage,
                choosePreset,
              }}
            />
          )}
          <ModuleSelection
            step={step}
            configuration={configuration}
            change={setConfiguration}
          />
          {step === 11 && (
            <div className="flex flex-col gap-4 rounded-xl border border-dotted border-neutral-300 bg-white p-5">
              <h3 className="text-sm font-semibold text-neutral-950">
                Ready to generate manifest
              </h3>
              <div className="grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-dotted border-neutral-300 bg-white p-3">
                  <span className="mb-1 block text-neutral-600">
                    Target Repository
                  </span>
                  <span className="break-all text-neutral-950">
                    {repositoryId || "Not selected"}
                  </span>
                </div>
                <div className="rounded-lg border border-dotted border-neutral-300 bg-white p-3">
                  <span className="mb-1 block text-neutral-600">
                    Target Commit
                  </span>
                  <span className="break-all text-neutral-950">
                    {commit || "Not selected"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-neutral-600">
                Review the normalized configuration below. The API verifies the
                commit and permissions before saving the manifest.
              </p>
              <CandyButton
                type="button"
                variant="pearl"
                size="default"
                disabled={
                  !preview || !repositoryId || !/^[a-f0-9]{40}$/.test(commit)
                }
                onClick={async () => {
                  await run(async () => {
                    const created = studioManifestResponseSchema.parse(
                      await studioRequest(
                        "start",
                        workspace.id,
                        { repositoryId, ref: commit, configuration: preview },
                        true,
                      ),
                    );
                    setManifest(created);
                    setHistory((previous) =>
                      [created, ...previous].slice(0, 50),
                    );
                    await startAnalysis(created);
                  });
                }}
              >
                Create manifest and start analysis
              </CandyButton>
            </div>
          )}
        </fieldset>

        <div className="flex items-center justify-between border-t border-dotted border-neutral-300 pt-4">
          <CandyButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || step === 0}
            onClick={() => setStep(step - 1)}
          >
            ← Previous step
          </CandyButton>
          <CandyButton
            type="button"
            variant="pearl"
            size="sm"
            disabled={busy || stepLoading || step === 11}
            onClick={() => setStep(step + 1)}
          >
            Next step →
          </CandyButton>
        </div>
      </section>

      <section
        aria-label="Configuration preview"
        className="flex min-w-0 flex-col gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-950">
            Configuration preview
          </h2>
          <span className="font-mono text-[11px] text-neutral-600">
            {configuration.analyzers.length} analyzers active
          </span>
        </div>

        {validation && (
          <div
            role="alert"
            className="rounded-xl border border-neutral-500/20 bg-neutral-100/10 p-3 text-xs text-neutral-800"
          >
            {validation}
          </div>
        )}

        {preview && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-600">
              Required dependency modules included automatically:{" "}
              <span className="font-mono text-neutral-900">
                {preview.analyzers
                  .filter((id) => !configuration.analyzers.includes(id))
                  .join(", ") || "none"}
              </span>
              .
            </p>
            <pre className="max-h-80 overflow-auto rounded-xl border border-dotted border-neutral-300 bg-white p-4 font-mono text-xs leading-relaxed text-neutral-900">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <CandyButton
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => choosePreset(studioDefaults)}
          >
            Reset to defaults
          </CandyButton>

          <CandyButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || !preview}
            onClick={async () => {
              await run(async () => {
                const result = z
                  .object({ configuration: studioConfigurationSchema })
                  .parse(
                    await studioRequest(
                      "validate",
                      workspace.id,
                      { configuration: preview },
                      true,
                    ),
                  );
                setConfiguration(result.configuration);
                setMessage("Configuration validated by the server.");
              });
            }}
          >
            Validate with server
          </CandyButton>
        </div>

        {manage ? (
          <div className="flex flex-wrap items-end gap-3 border-t border-dotted border-neutral-300 pt-4">
            <div className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
                Custom profile name
              </label>
              <input
                className="h-9 rounded-lg border border-dotted border-neutral-300 bg-white px-3 text-xs text-neutral-950 placeholder-neutral-600 outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
                placeholder="e.g. Full Security & AST Profile"
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <CandyButton
              type="button"
              variant="pearl"
              size="sm"
              disabled={busy || !name.trim() || !preview}
              onClick={async () => {
                await run(() => save(false));
              }}
            >
              {profile ? "Duplicate as new profile" : "Save new profile"}
            </CandyButton>

            {profile && (
              <>
                <CandyButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={busy || !preview || !name.trim()}
                  onClick={async () => {
                    await run(() => save(true));
                  }}
                >
                  Update profile
                </CandyButton>

                <CandyButton
                  type="button"
                  variant="ruby"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Delete this profile and its saved versions? Existing manifests remain available.",
                      )
                    )
                      await run(async () => {
                        await studioRequest(
                          "delete",
                          workspace.id,
                          { id: profile.id, revision: profile.revision },
                          true,
                        );
                        setProfile(null);
                        setName("");
                        await refreshProfiles();
                        setMessage("Profile deleted.");
                      });
                  }}
                >
                  Delete profile
                </CandyButton>
              </>
            )}
          </div>
        ) : (
          <p className="pt-2 text-xs text-neutral-600">
            Workspace owners and admins can save and manage versioned profiles.
          </p>
        )}
      </section>

      {manifest && (
        <section
          aria-label="Created manifest"
          className="flex flex-col gap-3 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neutral-800" />
            <h2 className="text-base font-bold text-neutral-950">
              Manifest created
            </h2>
          </div>
          <p className="font-mono text-xs break-all text-neutral-600">
            SHA-256: {manifest.hash}
          </p>
          {analysis?.manifestId === manifest.id ? (
            <Link
              className="text-sm underline underline-offset-4"
              href={`/graph?${new URLSearchParams({ workspaceId: workspace.id, jobId: analysis.jobId })}`}
            >
              Track analysis and open graph
            </Link>
          ) : (
            <CandyButton
              className="self-start"
              variant="pearl"
              disabled={busy}
              onClick={() => run(() => startAnalysis(manifest))}
            >
              Start analysis
            </CandyButton>
          )}
          <pre className="max-h-80 overflow-auto rounded-xl border border-dotted border-neutral-300 bg-white p-4 font-mono text-xs text-neutral-900">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-neutral-950">
            Recent manifests
          </h2>
          <span className="font-mono text-xs text-neutral-600">
            {sourceLoading
              ? "Loading history…"
              : `${history.length} manifests recorded`}
          </span>
        </div>

        {sourceLoading ? (
          <LoadingIndicator
            variant="inline"
            label="Loading manifest history…"
          />
        ) : history.length === 0 ? (
          <p className="text-xs text-neutral-600">
            No manifests generated yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((item) => (
              <button
                type="button"
                key={item.id}
                className="motion-safe:ease-control flex cursor-pointer flex-col gap-2 rounded-xl border border-dotted border-neutral-300 bg-white p-3 text-left hover:border-neutral-400 hover:bg-white motion-safe:transition-[background-color,border-color,color,translate,scale,box-shadow] motion-safe:duration-150"
                onClick={() => setManifest(item)}
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-semibold text-neutral-950">
                    {item.manifest.commitSha.slice(0, 8)}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-800">
                    {item.status}
                  </span>
                </div>
                <span className="truncate font-mono text-[11px] text-neutral-600">
                  {item.hash}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
