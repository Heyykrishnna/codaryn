"use client";
import { useEffect, useState } from "react";
import { versionSummarySchema } from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
import { button, control } from "@/src/features/repositories/api";
import {
  useArtifactResource,
  comparisonUrl,
  jobsSchema,
  versionsSchema,
  overviewSchema,
  policySchema,
  comparisonCreatedSchema,
} from "./api";
import { ComparisonResults } from "./results";
export function ComparisonExplorer({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const [refresh, setRefresh] = useState(0),
    [page, setPage] = useState(1),
    [jobId, setJobId] = useState(""),
    [fromId, setFromId] = useState(""),
    [toId, setToId] = useState(""),
    [requested, setRequested] = useState(""),
    [verify, setVerify] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [comparisonId, setComparisonId] = useState(""),
    [ref, setRef] = useState("refs/heads/main");
  const jobs = useArtifactResource(
      comparisonUrl("jobs", workspaceId, { _retry: refresh }),
      jobsSchema,
    ),
    versions = useArtifactResource(
      comparisonUrl("versions", workspaceId, { page, _retry: refresh }),
      versionsSchema,
    ),
    policies = useArtifactResource(
      comparisonUrl("policies", workspaceId, { _retry: refresh }),
      policySchema,
    ),
    overview = useArtifactResource(
      requested || toId || fromId
        ? comparisonUrl("overview", workspaceId, {
            snapshotId: requested || toId || fromId,
            _retry: refresh,
          })
        : null,
      overviewSchema,
    );
  const status = overview.data?.snapshot.status;
  useEffect(() => {
    if (!status || !["queued", "running"].includes(status)) return;
    const timer = setInterval(() => setRefresh((n) => n + 1), 3000);
    return () => clearInterval(timer);
  }, [status]);
  const error =
    jobs.error || versions.error || policies.error || overview.error;
  async function mutate(action: string, input: Record<string, unknown>) {
    setBusy(true);
    setMessage("");
    try {
      const response = await workspaceRequest(
        "comparison",
        action,
        workspaceId,
        input,
        true,
      );
      if (action === "request") {
        const summary = versionSummarySchema.parse(response);
        setRequested(summary.id);
        setMessage("Version queued for the immutable commit.");
      } else if (action === "compare") {
        setComparisonId(comparisonCreatedSchema.parse(response).id);
        setMessage("Comparison saved with immutable impact evidence.");
      } else setMessage("Push policy saved.");
      setRefresh((n) => n + 1);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Request failed. Refresh and retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p>
        Compare immutable repository versions. Reuse covers compatible static
        file artifacts; dependency relationships are reconciled for every run.
        Impact is potential static dependency reachability, not proof of runtime
        behavior.
      </p>
      <output aria-live="polite">
        {busy ? "Processing request…" : message}
      </output>
      {error && <p role="alert">{error}</p>}
      <form
        className="flex flex-col gap-3"
        action={() =>
          mutate("request", {
            jobId,
            baseId: fromId || null,
            verifyFull: verify,
          })
        }
      >
        <label className="flex min-w-0 flex-col gap-2">
          Repository analysis
          <select
            className={control}
            value={jobId}
            required
            onChange={(e) => setJobId(e.target.value)}
          >
            <option value="">Select a recent analysis</option>
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
            checked={verify}
            onChange={(e) => setVerify(e.target.checked)}
          />
          <span>
            Verify incremental output against a full analysis. This adds
            analysis work; a mismatch publishes the full result and reports
            fallback.
          </span>
        </label>
        <button className={`${button} self-start`} disabled={busy || !jobId}>
          Analyze version
        </button>
        <p>
          The selected Before snapshot is the optional cache baseline. Only
          completed versions of the same repository can be reused.
        </p>
      </form>
      {jobs.loading && <output>Loading analysis jobs…</output>}
      {jobs.data && !jobs.data.jobs.length && (
        <p>
          No eligible jobs. Create an analysis job in Analysis Studio first.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { label: "Before snapshot", value: fromId, set: setFromId },
          { label: "After snapshot", value: toId, set: setToId },
        ].map((selection) => (
          <label key={selection.label} className="flex min-w-0 flex-col gap-2">
            {selection.label}
            <select
              className={control}
              value={selection.value}
              onChange={(e) => {
                selection.set(e.target.value);
                setRequested("");
              }}
            >
              <option value="">Select a completed snapshot</option>
              {selection.value &&
                !versions.data?.snapshots.some(
                  (s) => s.id === selection.value,
                ) && (
                  <option value={selection.value}>
                    Selected historical version
                  </option>
                )}
              {versions.data?.snapshots
                .filter((s) => s.status === "completed")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.commitSha.slice(0, 12)} · {s.fileCount} files ·{" "}
                    {s.id.slice(0, 8)}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className={button}
          disabled={busy || !fromId || !toId || fromId === toId}
          onClick={() => mutate("compare", { fromId, toId })}
        >
          Compare versions
        </button>
        <button className={control} onClick={() => setRefresh((n) => n + 1)}>
          Refresh
        </button>
        <button
          className={control}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous versions
        </button>
        <button
          className={control}
          disabled={(versions.data?.snapshots.length ?? 0) < 20}
          onClick={() => setPage(page + 1)}
        >
          Next versions
        </button>
      </div>
      {versions.loading && <output>Loading version history…</output>}
      {versions.data && !versions.data.snapshots.length && (
        <p>No version snapshots on this page.</p>
      )}
      <ul className="grid gap-2 md:grid-cols-2">
        {versions.data?.snapshots.map((s) => (
          <li key={s.id}>
            <button className={control} onClick={() => setRequested(s.id)}>
              {s.commitSha.slice(0, 12)} · {s.status} · {s.fileCount} files ·{" "}
              {s.id.slice(0, 8)}
            </button>
          </li>
        ))}
      </ul>
      {overview.loading && <output>Loading version details…</output>}
      {overview.data && (
        <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-zinc-300 p-5 break-words dark:border-zinc-700">
          <h2 className="text-xl font-semibold">Version · {status}</h2>
          <p className="text-xs break-all">
            Commit {overview.data.snapshot.commitSha} · SHA-256{" "}
            {overview.data.snapshot.hash ?? "Pending"}
          </p>
          <p>
            {overview.data.symbols} symbols · {overview.data.relationships}{" "}
            relationships · {overview.data.schemaObjects} schema objects ·{" "}
            {overview.data.diagnostics} analysis boundaries/diagnostics
          </p>
          {overview.data.reuse && (
            <p>
              {overview.data.reuse.reused} file artifacts reused ·{" "}
              {overview.data.reuse.processed} processed · configuration
              invalidation {overview.data.reuse.invalidated ? "yes" : "no"} ·
              full verification {overview.data.reuse.verification}
            </p>
          )}
          {overview.data.snapshot.failureCode && (
            <p role="alert">
              Analysis failed: {overview.data.snapshot.failureCode}. Check
              worker configuration and repository access before retrying.
            </p>
          )}
        </section>
      )}
      <ComparisonResults
        key={`${workspaceId}:${comparisonId}`}
        workspaceId={workspaceId}
        comparisonId={comparisonId}
        onSelect={setComparisonId}
        refresh={refresh}
      />
      <section className="flex flex-col gap-3 rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
        <h2 className="text-xl font-semibold">Automatic push analysis</h2>
        <p>
          Disabled until an owner or administrator enables it. The selected
          analysis supplies the repository and immutable configuration template.
          Only matching signed branch pushes are scheduled; deleted branches are
          ignored.
        </p>
        {policies.data?.canManage ? (
          <form
            className="flex flex-wrap items-end gap-3"
            action={() => mutate("policy", { jobId, ref, enabled: true })}
          >
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              Branch ref
              <input
                className={control}
                value={ref}
                maxLength={200}
                onChange={(e) => setRef(e.target.value)}
                required
              />
            </label>
            <button className={button} disabled={busy || !jobId}>
              Enable push analysis
            </button>
            <button
              className={control}
              type="button"
              disabled={busy || !jobId}
              onClick={() => mutate("policy", { jobId, ref, enabled: false })}
            >
              Disable push analysis
            </button>
          </form>
        ) : (
          <p>
            Only workspace owners and administrators can manage push policies.
          </p>
        )}
        <ul>
          {policies.data?.items.map((policy) => (
            <li key={policy.repositoryId} className="text-sm break-words">
              {policy.repositoryId} · {policy.ref} ·{" "}
              {policy.enabled ? "enabled" : "disabled"}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
