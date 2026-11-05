"use client";

import { RepositoryStep, RevisionStep, ProfileStep } from "./source-steps";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  branchListSchema,
  commitListSchema,
  normalizeStudioConfiguration,
  repositoryListSchema,
  studioConfigurationSchema,
  studioDefaults,
  studioManifestResponseSchema,
  studioProfileListSchema,
  type StudioConfiguration,
  type WorkspaceSummary,
  type StudioManifestResponse,
} from "@codaryn/contracts";
import { api, type Repository } from "@/src/features/repositories/api";
import { studioRequest } from "./api";
import { ModuleSelection } from "./selections";
import { CandyButton } from "@/src/components/ui/candy-button";
import { LoaderOrb } from "@/src/components/ui/loader-orb";
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
  const [repoPage, setRepoPage] = useState(1);
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
  const [history, setHistory] = useState<StudioManifestResponse[]>([]);
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
    Promise.all([
      api("repositories", {
        workspaceId: workspace.id,
        page: String(repoPage),
      }),
      studioRequest("profiles", workspace.id, { page: profilePage }),
      studioRequest("manifests", workspace.id),
    ])
      .then(([rawRepos, rawProfiles, rawHistory]) => {
        const repos = repositoryListSchema.parse(rawRepos).repositories;
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
      });
    return () => {
      current = false;
    };
  }, [workspace.id, repoPage, profilePage]);

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
      });
    return () => {
      current = false;
    };
  }, [repositoryId, workspace.id, branchPage]);

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
      });
    return () => {
      current = false;
    };
  }, [repositoryId, branch, workspace.id, commitPage]);

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
      <div className="flex flex-col gap-2 rounded-xl border border-[#232734] bg-[#14161f] p-4 text-xs text-zinc-300">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">
            Workspace: {workspace.name} ({workspace.role})
          </span>
          {busy && (
            <LoaderOrb variant="inline" label="Executing studio pipeline…" />
          )}
        </div>
        <p className="text-zinc-400">
          Configure an immutable static analysis manifest. Analyzers extract
          evidence, AST topology, and API contracts.
        </p>
        {message && (
          <div
            role="alert"
            className="mt-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 font-mono text-xs text-blue-300"
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
                  ? "bg-white text-zinc-950 shadow-[0_2px_0_0_#d4d4d8]"
                  : isDone
                    ? "border border-[#262a37] bg-[#181a23] text-zinc-300 hover:bg-[#202330]"
                    : "border border-[#1d202a] bg-[#12141a] text-zinc-500 hover:bg-[#181a23] hover:text-zinc-300",
              )}
              onClick={() => setStep(index)}
            >
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full font-mono text-[10px]",
                  isCurrent
                    ? "bg-zinc-900 text-white"
                    : isDone
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-[#202330] text-zinc-500",
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
        className="flex flex-col gap-6 rounded-2xl border border-[#242835] bg-[#13151d] p-6 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-[#222532] pb-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 font-mono text-xs font-bold text-blue-400">
              {step + 1}
            </span>
            <h2 tabIndex={-1} className="text-lg font-bold text-white">
              {steps[step]}
            </h2>
          </div>
          <span className="font-mono text-xs text-zinc-500">
            Step {step + 1} of {steps.length}
          </span>
        </div>

        <fieldset disabled={busy} className="flex min-w-0 flex-col gap-5">
          {step === 0 && (
            <RepositoryStep
              {...{
                repositories,
                repositoryId,
                repoPage,
                setRepositoryId,
                setBranch,
                setCommit,
                setBranches,
                setCommits,
                setBranchPage,
                setCommitPage,
                setManifest,
                setRepoPage,
              }}
            />
          )}
          {step === 1 && (
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
          {step === 2 && (
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
            <div className="flex flex-col gap-4 rounded-xl border border-[#2b2f3e] bg-[#161822] p-5">
              <h3 className="text-sm font-semibold text-white">
                Ready to generate manifest
              </h3>
              <div className="grid grid-cols-1 gap-3 font-mono text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-[#222632] bg-[#11131a] p-3">
                  <span className="mb-1 block text-zinc-500">
                    Target Repository
                  </span>
                  <span className="break-all text-white">
                    {repositoryId || "Not selected"}
                  </span>
                </div>
                <div className="rounded-lg border border-[#222632] bg-[#11131a] p-3">
                  <span className="mb-1 block text-zinc-500">
                    Target Commit
                  </span>
                  <span className="break-all text-white">
                    {commit || "Not selected"}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Review the normalized configuration below. The API verifies the
                commit and permissions independently before triggering
                ingestion.
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
                    setHistory([created, ...history].slice(0, 50));
                    setMessage("Manifest created. Analyzer extraction queued.");
                  });
                }}
              >
                Create analysis manifest
              </CandyButton>
            </div>
          )}
        </fieldset>

        <div className="flex items-center justify-between border-t border-[#222532] pt-4">
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
            variant={step === 11 ? "pearl" : "azure"}
            size="sm"
            disabled={busy || step === 11}
            onClick={() => setStep(step + 1)}
          >
            Next step →
          </CandyButton>
        </div>
      </section>

      <section
        aria-label="Configuration preview"
        className="flex min-w-0 flex-col gap-4 rounded-2xl border border-[#242835] bg-[#13151d] p-6 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            Configuration preview
          </h2>
          <span className="rounded bg-[#1c1f2b] px-2 py-0.5 font-mono text-[11px] text-zinc-400">
            {configuration.analyzers.length} analyzers active
          </span>
        </div>

        {validation && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
          >
            {validation}
          </div>
        )}

        {preview && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-zinc-400">
              Required dependency modules included automatically:{" "}
              <span className="font-mono text-blue-400">
                {preview.analyzers
                  .filter((id) => !configuration.analyzers.includes(id))
                  .join(", ") || "none"}
              </span>
              .
            </p>
            <pre className="max-h-80 overflow-auto rounded-xl border border-[#242735] bg-[#0c0d12] p-4 font-mono text-xs leading-relaxed text-zinc-300">
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
          <div className="flex flex-wrap items-end gap-3 border-t border-[#222532] pt-4">
            <div className="flex min-w-[16rem] flex-1 flex-col gap-1.5">
              <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Custom profile name
              </label>
              <input
                className="h-9 rounded-lg border border-[#2b2f3d] bg-[#14161f] px-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
          <p className="pt-2 text-xs text-zinc-500">
            Workspace owners and admins can save and manage versioned profiles.
          </p>
        )}
      </section>

      {manifest && (
        <section
          aria-label="Created manifest"
          className="flex flex-col gap-3 rounded-2xl border border-emerald-500/20 bg-[#13151d] p-6 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <h2 className="text-base font-bold text-white">Manifest created</h2>
          </div>
          <p className="font-mono text-xs break-all text-zinc-400">
            SHA-256: {manifest.hash}
          </p>
          <pre className="max-h-80 overflow-auto rounded-xl border border-[#242735] bg-[#0c0d12] p-4 font-mono text-xs text-zinc-300">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-[#242835] bg-[#13151d] p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Recent manifests</h2>
          <span className="font-mono text-xs text-zinc-500">
            {history.length} manifests recorded
          </span>
        </div>

        {history.length === 0 ? (
          <p className="text-xs text-zinc-500">No manifests generated yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((item) => (
              <button
                type="button"
                key={item.id}
                className="flex cursor-pointer flex-col gap-2 rounded-xl border border-[#262a37] bg-[#161821] p-3 text-left transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
                onClick={() => setManifest(item)}
              >
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-semibold text-white">
                    {item.manifest.commitSha.slice(0, 8)}
                  </span>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                    {item.status}
                  </span>
                </div>
                <span className="truncate font-mono text-[11px] text-zinc-500">
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
