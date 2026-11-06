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
import { type Repository } from "@/src/features/repositories/api";
import { CandyButton } from "@/src/components/ui/candy-button";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";

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
  const repoOptions = repositories.map((item) => ({
    value: item.id,
    label: item.fullName,
    description: `Default branch: ${item.defaultBranch}`,
    badge: item.private ? "private" : "public",
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Connected repository
        </label>
        <DropdownSelect
          value={repositoryId}
          options={repoOptions}
          searchable
          placeholder="Select a repository…"
          onChange={(val) => {
            const selected = repositories.find((item) => item.id === val);
            setRepositoryId(val);
            setBranch(selected?.defaultBranch ?? "");
            setCommit("");
            setBranches([]);
            setCommits([]);
            setBranchPage(1);
            setCommitPage(1);
            setManifest(null);
          }}
        />
      </div>

      {repositories.length === 0 && (
        <div className="rounded-xl border border-dotted border-zinc-800 bg-[#121318] p-4 text-xs text-zinc-400">
          No repositories found on page {repoPage}.{" "}
          <Link
            className="text-zinc-200 underline hover:text-white"
            href="/repositories"
          >
            Connect and sync your GitHub installation
          </Link>
          .
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <CandyButton
          type="button"
          variant="secondary"
          size="xs"
          disabled={repoPage === 1}
          onClick={() => setRepoPage(repoPage - 1)}
        >
          Previous page
        </CandyButton>
        <span className="font-mono text-xs text-zinc-400">Page {repoPage}</span>
        <CandyButton
          type="button"
          variant="secondary"
          size="xs"
          disabled={repositories.length < 50}
          onClick={() => setRepoPage(repoPage + 1)}
        >
          Next page
        </CandyButton>
      </div>
    </div>
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
  const branchOptions = branches.map((item) => ({
    value: item.name,
    label: item.name,
    badge: item.sha.slice(0, 7),
  }));

  const commitOptions = commits.map((item) => ({
    value: item.sha,
    label: `${item.sha.slice(0, 8)} · ${item.message.split("\n")[0]}`,
    badge: item.sha.slice(0, 7),
  }));

  return (
    <div className="flex flex-col gap-5">
      {!repositoryId && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
          Select a repository in step 1 before selecting branches.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Git branch
        </label>
        <DropdownSelect
          value={branch}
          options={branchOptions}
          disabled={!repositoryId}
          searchable
          placeholder="Select branch…"
          onChange={(val) => {
            setBranch(val);
            setCommit("");
            setCommits([]);
            setCommitPage(1);
          }}
        />
        <div className="flex items-center justify-between pt-1">
          <CandyButton
            type="button"
            variant="ghost"
            size="xs"
            disabled={branchPage === 1}
            onClick={() => setBranchPage(branchPage - 1)}
          >
            ← Previous branches
          </CandyButton>
          <span className="font-mono text-[11px] text-zinc-500">
            Branch page {branchPage}
          </span>
          <CandyButton
            type="button"
            variant="ghost"
            size="xs"
            disabled={branches.length < 50}
            onClick={() => setBranchPage(branchPage + 1)}
          >
            Next branches →
          </CandyButton>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Commit SHA
        </label>
        <DropdownSelect
          value={commit}
          options={commitOptions}
          disabled={!branch}
          searchable
          placeholder="Select an immutable commit…"
          onChange={setCommit}
        />
        <div className="flex items-center justify-between pt-1">
          <CandyButton
            type="button"
            variant="ghost"
            size="xs"
            disabled={commitPage === 1}
            onClick={() => setCommitPage(commitPage - 1)}
          >
            ← Previous commits
          </CandyButton>
          <span className="font-mono text-[11px] text-zinc-500">
            Commit page {commitPage}
          </span>
          <CandyButton
            type="button"
            variant="ghost"
            size="xs"
            disabled={commits.length < 50}
            onClick={() => setCommitPage(commitPage + 1)}
          >
            Next commits →
          </CandyButton>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Or manual commit SHA (40 hex characters)
        </label>
        <input
          className="h-9 w-full rounded-lg border border-dotted border-zinc-700 bg-zinc-900 px-3 font-mono text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400"
          placeholder="e.g. 7ab99ec..."
          value={commit}
          maxLength={40}
          onChange={(event) => setCommit(event.target.value)}
        />
      </div>
    </div>
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
  const profileOptions = profiles.map((item) => ({
    value: item.id,
    label: item.name,
    badge: `rev ${item.revision}`,
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Preset templates
        </label>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {studioPresets.map((preset) => (
            <button
              type="button"
              key={preset.name}
              className="flex cursor-pointer items-center justify-between rounded-xl border border-dotted border-zinc-800 bg-[#121318] p-3 text-left transition-all duration-150 hover:border-zinc-600 hover:bg-[#181920]"
              onClick={() => choosePreset(preset.configuration)}
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white">
                  {preset.name}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {preset.configuration.analyzers.length} analyzers · depth{" "}
                  {preset.configuration.depth}
                </span>
              </div>
              <span className="font-mono text-[10px] text-zinc-300">Load</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          Saved workspace profiles
        </label>
        <DropdownSelect
          value={profile?.id ?? ""}
          options={profileOptions}
          placeholder="Choose a saved profile…"
          onChange={(val) => {
            const chosen = profiles.find((item) => item.id === val);
            if (chosen) {
              setProfile(chosen);
              setName(chosen.name);
              setConfiguration(chosen.configuration);
            }
          }}
        />
        <div className="flex items-center justify-between pt-1">
          <CandyButton
            type="button"
            variant="ghost"
            size="xs"
            disabled={profilePage === 1}
            onClick={() => setProfilePage(profilePage - 1)}
          >
            ← Previous profiles
          </CandyButton>
          <span className="font-mono text-[11px] text-zinc-500">
            Profile page {profilePage}
          </span>
          <CandyButton
            type="button"
            variant="ghost"
            size="xs"
            disabled={profiles.length < 50}
            onClick={() => setProfilePage(profilePage + 1)}
          >
            Next profiles →
          </CandyButton>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">
        Select any preset, customize modules across analyzer steps, and save as
        a versioned profile below.
      </p>
    </div>
  );
}
