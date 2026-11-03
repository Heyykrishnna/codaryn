"use client";
import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import {
  studioPresets,
  type StudioConfiguration,
  type StudioManifestResponse,
  type studioProfileSchema,
} from "@codaryn/contracts";
import type { z } from "zod";
import { control, type Repository } from "@/src/features/repositories/api";
type Setter<T> = Dispatch<SetStateAction<T>>;
type Branch = { name: string; sha: string };
type Commit = { sha: string; message: string };
type Profile = z.infer<typeof studioProfileSchema>;
type SelectionState = {
  repositories: Repository[];
  repositoryId: string;
  repoPage: number;
  branch: string;
  branches: Branch[];
  branchPage: number;
  commits: Commit[];
  commit: string;
  commitPage: number;
  profiles: Profile[];
  profile: Profile | null;
  profilePage: number;
  setRepositoryId: Setter<string>;
  setBranch: Setter<string>;
  setCommit: Setter<string>;
  setBranches: Setter<Branch[]>;
  setCommits: Setter<Commit[]>;
  setBranchPage: Setter<number>;
  setCommitPage: Setter<number>;
  setManifest: Setter<StudioManifestResponse | null>;
  setRepoPage: Setter<number>;
  setProfile: Setter<Profile | null>;
  setName: Setter<string>;
  setConfiguration: Setter<StudioConfiguration>;
  setProfilePage: Setter<number>;
  choosePreset: (configuration: StudioConfiguration) => void;
};
export function RepositoryStep({
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
}: Readonly<
  Pick<
    SelectionState,
    | "repositories"
    | "repositoryId"
    | "repoPage"
    | "setRepositoryId"
    | "setBranch"
    | "setCommit"
    | "setBranches"
    | "setCommits"
    | "setBranchPage"
    | "setCommitPage"
    | "setManifest"
    | "setRepoPage"
  >
>) {
  return (
    <>
      <label className="flex flex-col gap-2">
        <span>Connected repository</span>
        <select
          className={control}
          value={repositoryId}
          onChange={(event) => {
            const selected = repositories.find(
              (item) => item.id === event.target.value,
            );
            setRepositoryId(event.target.value);
            setBranch(selected?.defaultBranch ?? "");
            setCommit("");
            setBranches([]);
            setCommits([]);
            setBranchPage(1);
            setCommitPage(1);
            setManifest(null);
          }}
        >
          <option value="">Select a repository</option>
          {repositories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.fullName}
            </option>
          ))}
        </select>
      </label>
      {repositories.length === 0 && (
        <p>
          No repositories on this page.{" "}
          <Link
            className="text-indigo-600 underline dark:text-indigo-400"
            href="/repositories"
          >
            Connect and sync a GitHub installation
          </Link>
          .
        </p>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          className={control}
          disabled={repoPage === 1}
          onClick={() => setRepoPage(repoPage - 1)}
        >
          Previous repositories
        </button>
        <span>Page {repoPage}</span>
        <button
          type="button"
          className={control}
          disabled={repositories.length < 50}
          onClick={() => setRepoPage(repoPage + 1)}
        >
          Next repositories
        </button>
      </div>
    </>
  );
}
export function RevisionStep({
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
}: Readonly<
  Pick<
    SelectionState,
    | "repositoryId"
    | "branch"
    | "branches"
    | "branchPage"
    | "commits"
    | "commit"
    | "commitPage"
    | "setBranch"
    | "setCommit"
    | "setCommits"
    | "setCommitPage"
    | "setBranchPage"
  >
>) {
  return (
    <>
      {!repositoryId && <p>Select a repository first.</p>}
      <label className="flex flex-col gap-2">
        <span>Branch</span>
        <select
          className={control}
          disabled={!repositoryId}
          value={branch}
          onChange={(event) => {
            setBranch(event.target.value);
            setCommit("");
            setCommits([]);
            setCommitPage(1);
          }}
        >
          <option value="">Select branch</option>
          {branch && !branches.some((item) => item.name === branch) && (
            <option value={branch}>{branch}</option>
          )}
          {branches.map((item) => (
            <option key={item.name} value={item.name}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          className={control}
          disabled={branchPage === 1}
          onClick={() => setBranchPage(branchPage - 1)}
        >
          Previous branches
        </button>
        <button
          type="button"
          className={control}
          disabled={branches.length < 50}
          onClick={() => setBranchPage(branchPage + 1)}
        >
          Next branches
        </button>
      </div>
      <label className="flex flex-col gap-2">
        <span>Commit</span>
        <select
          className={control}
          value={commit}
          disabled={!branch}
          onChange={(event) => setCommit(event.target.value)}
        >
          <option value="">Select an immutable commit</option>
          {commit && !commits.some((item) => item.sha === commit) && (
            <option value={commit}>{commit}</option>
          )}
          {commits.map((item) => (
            <option key={item.sha} value={item.sha}>
              {item.sha.slice(0, 12)} · {item.message.split("\n")[0]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          className={control}
          disabled={commitPage === 1}
          onClick={() => setCommitPage(commitPage - 1)}
        >
          Previous commits
        </button>
        <button
          type="button"
          className={control}
          disabled={commits.length < 50}
          onClick={() => setCommitPage(commitPage + 1)}
        >
          Next commits
        </button>
      </div>
      <label className="flex flex-col gap-2">
        <span>Or enter a full commit SHA</span>
        <input
          className={control}
          value={commit}
          maxLength={40}
          onChange={(event) => setCommit(event.target.value)}
        />
      </label>
    </>
  );
}
export function ProfileStep({
  profiles,
  profile,
  profilePage,
  setProfile,
  setName,
  setConfiguration,
  setProfilePage,
  choosePreset,
}: Readonly<
  Pick<
    SelectionState,
    | "profiles"
    | "profile"
    | "profilePage"
    | "setProfile"
    | "setName"
    | "setConfiguration"
    | "setProfilePage"
    | "choosePreset"
  >
>) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {studioPresets.map((preset) => (
          <button
            type="button"
            key={preset.name}
            className={control}
            onClick={() => choosePreset(preset.configuration)}
          >
            {preset.name}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-2">
        <span>Saved workspace profiles</span>
        <select
          className={control}
          value={profile?.id ?? ""}
          onChange={(event) => {
            const chosen = profiles.find(
              (item) => item.id === event.target.value,
            );
            if (chosen) {
              setProfile(chosen);
              setName(chosen.name);
              setConfiguration(chosen.configuration);
            }
          }}
        >
          <option value="">Choose a profile</option>
          {profiles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · revision {item.revision}
            </option>
          ))}
        </select>
      </label>
      <div className="flex gap-3">
        <button
          type="button"
          className={control}
          disabled={profilePage === 1}
          onClick={() => setProfilePage(profilePage - 1)}
        >
          Previous profiles
        </button>
        <button
          type="button"
          className={control}
          disabled={profiles.length < 50}
          onClick={() => setProfilePage(profilePage + 1)}
        >
          Next profiles
        </button>
      </div>
      <p className="text-sm">
        Select any preset, customize modules, and save below. Required
        dependencies appear in the preview.
      </p>
    </>
  );
}
