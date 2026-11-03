"use client";
import { RepositoryStep, RevisionStep, ProfileStep } from "./source-steps";
import Link from "next/link";
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
import {
  api,
  button,
  control,
  type Repository,
} from "@/src/features/repositories/api";
import { studioRequest } from "./api";
import { ModuleSelection } from "./selections";
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
    <div className="flex flex-col gap-6">
      <p>
        Workspace: {workspace.name}. Configure a static analysis manifest.
        Analyzer execution and output rendering arrive in the later analysis
        phases.
      </p>
      <output className="block text-sm" aria-live="polite">
        {busy ? "Working…" : message}
      </output>
      <nav aria-label="Analysis steps" className="flex flex-wrap gap-2">
        {steps.map((label, index) => (
          <button
            type="button"
            key={label}
            aria-current={step === index ? "step" : undefined}
            disabled={busy}
            className={step === index ? button : control}
            onClick={() => setStep(index)}
          >
            {index + 1}. {label}
          </button>
        ))}
      </nav>
      <section
        aria-label={steps[step]}
        className="flex flex-col gap-5 rounded-xl border border-zinc-300 p-6 dark:border-zinc-700"
      >
        <h2 tabIndex={-1} className="text-xl font-semibold">
          {step + 1}. {steps[step]}
        </h2>
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
            <>
              <p>Repository: {repositoryId || "Not selected"}</p>
              <p className="break-all">Commit: {commit || "Not selected"}</p>
              <p>
                Review the normalized configuration below. The API verifies the
                commit and permissions independently.
              </p>
              <button
                type="button"
                className={button}
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
                    setMessage(
                      "Manifest created. Execution is not enabled in this phase.",
                    );
                  });
                }}
              >
                Create analysis manifest
              </button>
            </>
          )}
        </fieldset>
      </section>
      <section
        aria-label="Configuration preview"
        className="flex min-w-0 flex-col gap-4"
      >
        <h2 className="text-xl font-semibold">Configuration preview</h2>
        {validation && (
          <p role="alert" className="text-red-700 dark:text-red-400">
            {validation}
          </p>
        )}
        {preview && (
          <>
            <p>
              Required modules are included automatically:{" "}
              {preview.analyzers
                .filter((id) => !configuration.analyzers.includes(id))
                .join(", ") || "none"}
              .
            </p>
            <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
              {JSON.stringify(preview, null, 2)}
            </pre>
          </>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className={control}
            disabled={busy}
            onClick={() => choosePreset(studioDefaults)}
          >
            Reset to defaults
          </button>
          <button
            type="button"
            className={control}
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
          </button>
        </div>
        {manage ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-2">
              <span>Custom profile name</span>
              <input
                className={control}
                maxLength={100}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <button
              type="button"
              className={button}
              disabled={busy || !name.trim() || !preview}
              onClick={async () => {
                await run(() => save(false));
              }}
            >
              {profile ? "Duplicate as new profile" : "Save new profile"}
            </button>
            {profile && (
              <>
                <button
                  type="button"
                  className={control}
                  disabled={busy || !preview || !name.trim()}
                  onClick={async () => {
                    await run(() => save(true));
                  }}
                >
                  Update profile
                </button>
                <button
                  type="button"
                  className={control}
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
                </button>
              </>
            )}
          </div>
        ) : (
          <p>Workspace owners and admins can save and manage profiles.</p>
        )}
      </section>
      <div className="flex justify-between gap-4">
        <button
          type="button"
          className={control}
          disabled={busy || step === 0}
          onClick={() => setStep(step - 1)}
        >
          Previous step
        </button>
        <button
          type="button"
          className={button}
          disabled={busy || step === 11}
          onClick={() => setStep(step + 1)}
        >
          Next step
        </button>
      </div>
      {manifest && (
        <section aria-label="Created manifest">
          <h2 className="text-xl font-semibold">Manifest created</h2>
          <p className="break-all">SHA-256: {manifest.hash}</p>
          <pre className="max-h-96 overflow-auto rounded-lg bg-zinc-100 p-4 text-sm dark:bg-zinc-900">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </section>
      )}
      <section>
        <h2 className="text-xl font-semibold">Recent manifests</h2>
        {history.length === 0 && <p>No manifests yet.</p>}
        <ul className="flex flex-col gap-3">
          {history.map((item) => (
            <li key={item.id} className="break-all">
              <button
                type="button"
                className={control}
                onClick={() => setManifest(item)}
              >
                {item.manifest.commitSha.slice(0, 12)} ·{" "}
                {item.hash.slice(0, 16)} · {item.status}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
