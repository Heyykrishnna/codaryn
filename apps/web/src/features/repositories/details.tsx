"use client";
import { useEffect, useState } from "react";
import {
  branchListSchema,
  commitListSchema,
  ingestionRunListSchema,
} from "@codaryn/contracts";
import { api, button, control, type Repository, type Run } from "./api";
export function RepositoryDetails({
  selected,
  workspaceId,
}: {
  selected: Repository;
  workspaceId: string;
}) {
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
    void Promise.all([
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
      <p role="status" aria-live="polite">
        {busy ? "Working…" : message}
      </p>
      <section className="flex flex-col gap-4 rounded-xl border border-zinc-300 p-6 dark:border-zinc-700">
        <h2 className="text-xl font-semibold break-all">{selected.fullName}</h2>
        <p className="text-sm">
          Static ingestion only. No dependencies or repository scripts are
          executed.
        </p>
        <label className="flex flex-col gap-2">
          Branch
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
          className={button}
          disabled={busy || !hasMoreBranches}
          onClick={() => {
            void run(async () => {
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
          className={button}
          disabled={busy || !branch}
          onClick={() => {
            void run(async () => {
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
          Commit
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
          className={button}
          disabled={busy || !hasMoreCommits}
          onClick={() => {
            void run(async () => {
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
          Specific full commit SHA (optional)
          <input
            className={control}
            value={ref}
            placeholder="40-character commit SHA"
            onChange={(event) => setRef(event.target.value)}
          />
        </label>
        <button
          className={button}
          disabled={busy || !branch}
          onClick={() => {
            void run(async () => {
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
          className={button}
          disabled={busy}
          onClick={() => {
            void run(async () =>
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
        <h3 className="font-semibold">Recent ingestions</h3>
        {runs.length === 0 && <p>No ingestions yet.</p>}
        {runs.map((item) => (
          <div
            className="rounded-lg border border-zinc-300 p-4 text-sm break-all dark:border-zinc-700"
            key={item.id}
          >
            <p>{item.commitSha}</p>
            <p>
              {item.status}
              {item.errorCode ? ` · ${item.errorCode}` : ""}
            </p>
            {item.inventory && (
              <>
                <p>
                  {item.inventory.fileCount} files ·{" "}
                  {item.inventory.monorepo ? "Monorepo" : "Single project"}
                </p>
                <p>
                  Package roots:{" "}
                  {item.inventory.packageRoots.join(", ") || "None detected"}
                </p>
                <p>Archive SHA-256: {item.inventory.archiveSha256}</p>
              </>
            )}
          </div>
        ))}
      </section>
    </>
  );
}
