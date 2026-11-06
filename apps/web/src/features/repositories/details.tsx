"use client";
import { useEffect, useState } from "react";
import {
  branchListSchema,
  commitListSchema,
  ingestionRunListSchema,
} from "@codaryn/contracts";
import { api, button, control, type Repository, type Run } from "./api";
import { LoaderOrb } from "@/src/components/ui/loader-orb";
export function RepositoryDetails({
  selected,
  workspaceId,
}: Readonly<{
  selected: Repository;
  workspaceId: string;
}>) {
  const [branches, setBranches] = useState<{ name: string; sha: string }[]>([]);
  const [commits, setCommits] = useState<{ sha: string; message: string }[]>(
    [],
  );
  const [branch, setBranch] = useState(selected.defaultBranch);
  const [ref, setRef] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [branchPage, setBranchPage] = useState(1);
  const [commitPage, setCommitPage] = useState(1);
  const [hasMoreBranches, setHasMoreBranches] = useState(false);
  const [hasMoreCommits, setHasMoreCommits] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let current = true;
    Promise.all([
      api("branches", { workspaceId, repositoryId: selected.id, page: "1" }),
      api("runs", { workspaceId, repositoryId: selected.id }),
    ])
      .then(([rawBranches, rawRuns]) => {
        const list = branchListSchema.parse(rawBranches);
        const history = ingestionRunListSchema.parse(rawRuns);
        if (current) {
          setBranches(list.branches);
          setHasMoreBranches(list.branches.length === 50);
          setRuns(history.runs);
        }
      })
      .catch(() => {
        if (current)
          setMessage(
            "Unable to load repository details. Check GitHub access and retry.",
          );
      });
    return () => {
      current = false;
    };
  }, [selected.id, workspaceId]);
  async function run(operation: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Repository request failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {busy && (
        <div className="flex items-center justify-center py-2">
          <LoaderOrb variant="inline" label="Processing ingestion task…" />
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
      <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-zinc-800 bg-[#111216] p-6 text-xs text-zinc-300">
        <h2 className="text-xl font-semibold break-all text-white">
          {selected.fullName}
        </h2>
        <p className="text-zinc-400">
          Static ingestion only. No dependencies or repository scripts are
          executed.
        </p>
        <label className="flex flex-col gap-2">
          <span>Branch</span>
          <select
            className={control}
            value={branch}
            disabled={busy}
            onChange={(event) => {
              setBranch(event.target.value);
              setRef("");
              setCommits([]);
              setCommitPage(1);
            }}
          >
            {!branches.some((item) => item.name === branch) && (
              <option value={branch}>{branch}</option>
            )}
            {branches.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={button}
          disabled={busy || !hasMoreBranches}
          onClick={async () => {
            await run(async () => {
              const next = branchListSchema.parse(
                await api("branches", {
                  workspaceId,
                  repositoryId: selected.id,
                  page: String(branchPage + 1),
                }),
              );
              setBranches([...branches, ...next.branches]);
              setHasMoreBranches(next.branches.length === 50);
              setBranchPage(branchPage + 1);
            });
          }}
        >
          Load more branches
        </button>
        <button
          type="button"
          className={button}
          disabled={busy || !branch}
          onClick={async () => {
            await run(async () => {
              const result = commitListSchema.parse(
                await api("commits", {
                  workspaceId,
                  repositoryId: selected.id,
                  branch,
                  page: "1",
                }),
              );
              setCommits(result.commits);
              setHasMoreCommits(result.commits.length === 50);
              setCommitPage(1);
            });
          }}
        >
          Load commits
        </button>
        <label className="flex flex-col gap-2">
          <span>Commit</span>
          <select
            className={control}
            value={ref}
            disabled={busy}
            onChange={(event) => setRef(event.target.value)}
          >
            <option value="">Current branch head</option>
            {commits.map((commit) => (
              <option key={commit.sha} value={commit.sha}>
                {commit.sha.slice(0, 12)} · {commit.message.split("\n")[0]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={button}
          disabled={busy || !hasMoreCommits}
          onClick={async () => {
            await run(async () => {
              const next = commitListSchema.parse(
                await api("commits", {
                  workspaceId,
                  repositoryId: selected.id,
                  branch,
                  page: String(commitPage + 1),
                }),
              );
              setCommits([...commits, ...next.commits]);
              setHasMoreCommits(next.commits.length === 50);
              setCommitPage(commitPage + 1);
            });
          }}
        >
          Load more commits
        </button>
        <label className="flex flex-col gap-2">
          <span>Specific full commit SHA (optional)</span>
          <input
            className={control}
            value={ref}
            placeholder="40-character commit SHA"
            onChange={(event) => setRef(event.target.value)}
          />
        </label>
        <button
          type="button"
          className={button}
          disabled={busy || !branch}
          onClick={async () => {
            await run(async () => {
              await api(
                "ingest",
                {
                  workspaceId,
                  repositoryId: selected.id,
                  ref: ref || branch,
                },
                true,
              );
              setRuns(
                ingestionRunListSchema.parse(
                  await api("runs", {
                    workspaceId,
                    repositoryId: selected.id,
                  }),
                ).runs,
              );
              setMessage(
                "Ingestion queued. Refresh status to inspect progress.",
              );
            });
          }}
        >
          Ingest selected commit
        </button>
        <button
          type="button"
          className={button}
          disabled={busy}
          onClick={async () => {
            await run(async () =>
              setRuns(
                ingestionRunListSchema.parse(
                  await api("runs", {
                    workspaceId,
                    repositoryId: selected.id,
                  }),
                ).runs,
              ),
            );
          }}
        >
          Refresh ingestion status
        </button>
        <h3 className="font-semibold text-white">Recent ingestions</h3>
        {runs.length === 0 && (
          <p className="text-zinc-500">No ingestions yet.</p>
        )}
        {runs.map((item) => (
          <div
            className="rounded-xl border border-dotted border-zinc-800 bg-zinc-900/60 p-4 font-mono text-xs break-all text-zinc-300"
            key={item.id}
          >
            <p className="font-bold text-white">{item.commitSha}</p>
            <p className="text-zinc-400">
              {item.status}
              {item.errorCode ? ` · ${item.errorCode}` : ""}
            </p>
            {item.inventory && (
              <>
                <p className="mt-1 text-zinc-400">
                  {item.inventory.fileCount} files ·{" "}
                  {item.inventory.monorepo ? "Monorepo" : "Single project"}
                </p>
                <p className="text-zinc-400">
                  Package roots:{" "}
                  {item.inventory.packageRoots.join(", ") || "None detected"}
                </p>
                <p className="text-zinc-500">
                  Archive SHA-256: {item.inventory.archiveSha256}
                </p>
              </>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
