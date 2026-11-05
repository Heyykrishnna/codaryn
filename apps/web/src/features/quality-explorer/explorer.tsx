"use client";
import { useEffect, useState } from "react";
import { qualitySummarySchema } from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
import { button, control } from "@/src/features/repositories/api";
import {
  useArtifactResource,
  qualityUrl,
  jobsSchema,
  summariesSchema,
  overviewSchema,
} from "./api";
import { QualityInventory } from "./inventory";
import { SecurityDashboard } from "./security";
export function QualityExplorer({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const [refresh, setRefresh] = useState(0),
    [page, setPage] = useState(1),
    [jobId, setJobId] = useState(""),
    [snapshotId, setSnapshotId] = useState(""),
    [external, setExternal] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const jobs = useArtifactResource(
      qualityUrl("jobs", workspaceId, { _retry: refresh }),
      jobsSchema,
    ),
    history = useArtifactResource(
      qualityUrl("snapshots", workspaceId, { page, _retry: refresh }),
      summariesSchema,
    ),
    overview = useArtifactResource(
      snapshotId
        ? qualityUrl("overview", workspaceId, { snapshotId, _retry: refresh })
        : null,
      overviewSchema,
    );
  const status = overview.data?.snapshot.status;
  useEffect(() => {
    if (!snapshotId || !status || !["queued", "running"].includes(status))
      return;
    const timer = setInterval(() => setRefresh((n) => n + 1), 3000);
    return () => clearInterval(timer);
  }, [snapshotId, status]);
  const error = jobs.error || history.error || overview.error;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p>
        Explore infrastructure, testing evidence and security signals for an
        immutable repository commit. Findings require review. An empty result
        does not establish that a repository is secure.
      </p>
      <output aria-live="polite">
        {busy ? "Queuing quality analysis…" : message}
      </output>
      {error && <p role="alert">{error}</p>}
      <form
        className="flex flex-col gap-3"
        action={async () => {
          setBusy(true);
          setMessage("");
          try {
            const result = qualitySummarySchema.parse(
              await workspaceRequest(
                "quality",
                "request",
                workspaceId,
                { jobId, externalScans: external },
                true,
              ),
            );
            setSnapshotId(result.id);
            setRefresh((n) => n + 1);
            setMessage("Quality snapshot queued for the selected commit.");
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Quality request failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="flex min-w-0 flex-col gap-2">
          Repository analysis
          <select
            className={control}
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            required
          >
            <option value="">Select a recent analysis job</option>
            {jobs.data?.jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.full_name} · {job.ref} · {job.commit_sha.slice(0, 12)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-start gap-3">
          <input
            className="mt-1 accent-indigo-600"
            type="checkbox"
            checked={external}
            onChange={(e) => setExternal(e.target.checked)}
            disabled={
              overview.data
                ? !overview.data.canReview ||
                  !overview.data.externalScansAvailable
                : false
            }
          />
          <span>
            Allow OSV lookup: send resolved dependency names and versions to the
            public OSV service. Requires an owner or administrator and
            deployment approval. Source files and declared ranges are not
            submitted.
          </span>
        </label>
        <button className={`${button} self-start`} disabled={busy || !jobId}>
          Extract quality snapshot
        </button>
      </form>
      {jobs.loading && <output>Loading analysis jobs…</output>}
      {jobs.data && !jobs.data.jobs.length && (
        <p>
          No eligible jobs. Create an analysis job in Analysis Studio first.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          Quality snapshot
          <select
            className={control}
            value={snapshotId}
            onChange={(e) => setSnapshotId(e.target.value)}
          >
            <option value="">Select a snapshot</option>
            {snapshotId &&
              !history.data?.snapshots.some((s) => s.id === snapshotId) && (
                <option value={snapshotId}>Requested snapshot</option>
              )}
            {history.data?.snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.commitSha.slice(0, 12)} · {s.status} · {s.findingCount}{" "}
                findings · {s.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <button className={control} onClick={() => setRefresh((n) => n + 1)}>
          Refresh
        </button>
        <button
          className={control}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous snapshots
        </button>
        <button
          className={control}
          disabled={(history.data?.snapshots.length ?? 0) < 20}
          onClick={() => setPage(page + 1)}
        >
          Next snapshots
        </button>
      </div>
      {history.loading && <output>Loading snapshot history…</output>}
      {history.data && !history.data.snapshots.length && (
        <p>No quality snapshots on this page.</p>
      )}
      {overview.loading && <output>Loading quality overview…</output>}
      {overview.data && (
        <section className="flex flex-col gap-3 rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
          <h2 className="text-xl font-semibold">Quality overview · {status}</h2>
          <p>
            {overview.data.resources} resources · {overview.data.tests} tests ·{" "}
            {overview.data.dependencies} dependency records ·{" "}
            {overview.data.findings} findings
          </p>
          <p className="text-xs break-all">
            Commit: {overview.data.snapshot.commitSha} · SHA-256:{" "}
            {overview.data.snapshot.hash ?? "Pending"}
          </p>
          {overview.data.snapshot.failureCode && (
            <p role="alert">
              Analysis failed: {overview.data.snapshot.failureCode}. Verify
              worker configuration and repository access before retrying.
            </p>
          )}
          <ul>
            {overview.data.scanners.map((scanner) => (
              <li key={scanner.tool}>
                <strong>
                  {scanner.tool}: {scanner.status}
                </strong>{" "}
                · {scanner.message} · {scanner.version}
                {scanner.checkedAt ? ` · ${scanner.checkedAt}` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
      {status === "completed" && overview.data && (
        <>
          <QualityInventory
            key={snapshotId}
            workspaceId={workspaceId}
            snapshotId={snapshotId}
          />
          <SecurityDashboard
            key={snapshotId}
            workspaceId={workspaceId}
            snapshotId={snapshotId}
            overview={overview.data}
            onReview={() => setRefresh((n) => n + 1)}
          />
          <details>
            <summary className="cursor-pointer font-semibold">
              Analysis diagnostics ({overview.data.diagnosticCount})
            </summary>
            <ul>
              {overview.data.diagnostics.map((d, i) => (
                <li key={`${d.code}:${i}`}>
                  {d.code}: {d.message} · {d.evidence.path}:
                  {d.evidence.startLine}
                </li>
              ))}
            </ul>
            <p>Showing up to 30 diagnostics.</p>
          </details>
        </>
      )}
    </div>
  );
}
