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
  setProfile: Setter<Profile | null>;
  setName: Setter<string>;
  setConfiguration: Setter<StudioConfiguration>;
  setProfilePage: Setter<number>;
  choosePreset: (configuration: StudioConfiguration) => void;
};

export function RepositoryStep({
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
}: Readonly<
  Pick<
    SelectionState,
    | "repositories"
    | "repositoryId"
    | "setRepositoryId"
    | "setBranch"
    | "setCommit"
    | "setBranches"
    | "setCommits"
    | "setBranchPage"
    | "setCommitPage"
    | "setManifest"
  >
>) {
  const repoOptions = repositories.map((item) => ({
    value: item.id,
    label: item.fullName,
    description: `Default branch: ${item.defaultBranch}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
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
        <div className="rounded-xl border border-dotted border-neutral-300 bg-white p-4 text-xs text-neutral-600">
          No connected repositories found.{" "}
          <Link
            className="text-neutral-900 underline hover:text-neutral-950"
            href="/repositories"
          >
            Connect and sync your GitHub installation
          </Link>
          .
        </div>
      )}
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
  }));

  const commitOptions = commits.map((item) => ({
    value: item.sha,
    label: `${item.sha.slice(0, 8)} · ${item.message.split("\n")[0]}`,
  }));

  return (
    <div className="flex flex-col gap-5">
      {!repositoryId && (
        <div className="rounded-xl border border-neutral-500/20 bg-neutral-100/10 p-3 text-xs text-neutral-800">
          Select a repository in step 1 before selecting branches.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
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
          <span className="font-mono text-[11px] text-neutral-600">
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
        <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
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
          <span className="font-mono text-[11px] text-neutral-600">
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
        <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
          Or manual commit SHA (40 hex characters)
        </label>
        <input
          className="h-9 w-full rounded-lg border border-dotted border-neutral-300 bg-white px-3 font-mono text-xs text-neutral-950 placeholder-neutral-600 outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
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
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
          Preset templates
        </label>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {studioPresets.map((preset) => (
            <button
              type="button"
              key={preset.name}
              className="motion-safe:ease-control flex cursor-pointer items-center justify-between rounded-xl border border-dotted border-neutral-300 bg-white p-3 text-left hover:border-neutral-400 hover:bg-white motion-safe:transition-[background-color,border-color,color,translate,scale,box-shadow] motion-safe:duration-150"
              onClick={() => choosePreset(preset.configuration)}
            >
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-neutral-950">
                  {preset.name}
                </span>
                <span className="text-[11px] text-neutral-600">
                  {preset.configuration.analyzers.length} analyzers · depth{" "}
                  {preset.configuration.depth}
                </span>
              </div>
              <span className="font-mono text-[10px] text-neutral-900">
                Load
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
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
          <span className="font-mono text-[11px] text-neutral-600">
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

      <p className="text-xs leading-relaxed text-neutral-600">
        Select any preset, customize modules across analyzer steps, and save as
        a versioned profile below.
      </p>
    </div>
  );
}
