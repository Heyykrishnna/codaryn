"use client";

import { useEffect, useState } from "react";
import { versionSummarySchema } from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
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
import { CandyButton } from "@/src/components/ui/candy-button";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";

export function ComparisonExplorer({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [jobId, setJobId] = useState("");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [requested, setRequested] = useState("");
  const [verify, setVerify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [comparisonId, setComparisonId] = useState("");
  const [ref, setRef] = useState("refs/heads/main");

  const jobs = useArtifactResource(
    comparisonUrl("jobs", workspaceId, { _retry: refresh }),
    jobsSchema,
  );
  const versions = useArtifactResource(
    comparisonUrl("versions", workspaceId, { page, _retry: refresh }),
    versionsSchema,
  );
  const policies = useArtifactResource(
    comparisonUrl("policies", workspaceId, { _retry: refresh }),
    policySchema,
  );
  const overview = useArtifactResource(
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
      } else {
        setMessage("Push policy saved.");
      }
      setRefresh((n) => n + 1);
    } catch (err) {
      setMessage(
        err instanceof Error
          ? err.message
          : "Request failed. Refresh and retry.",
      );
    } finally {
      setBusy(false);
    }
  }

  const jobOptions =
    jobs.data?.jobs.map((job) => ({
      value: job.id,
      label: `${job.full_name} · ${job.ref}`,

      description: job.id,
    })) ?? [];

  const completedSnapshots =
    versions.data?.snapshots.filter((s) => s.status === "completed") ?? [];

  const snapshotOptions = completedSnapshots.map((s) => ({
    value: s.id,
    label: `${s.commitSha.slice(0, 8)} · ${s.status}`,

    description: s.commitSha,
  }));

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-2 rounded-xl border border-dotted border-neutral-300 bg-white p-4 text-xs text-neutral-900">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-neutral-950">
            Architecture Comparisons & Impact Diff
          </span>
          {busy && (
            <LoadingIndicator
              variant="inline"
              label="Comparing architecture graphs…"
            />
          )}
        </div>
        <p className="text-neutral-600">
          Compare immutable codebase versions side by side. Detect broken
          contracts, new dependency cycles, and structural drift before merge.
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

      {(jobs.loading || versions.loading || policies.loading) && (
        <LoadingIndicator label="Loading comparison inputs…" />
      )}
      {overview.loading && (
        <LoadingIndicator variant="inline" label="Loading version overview…" />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-neutral-500/20 bg-neutral-100/10 p-3 text-xs text-neutral-800"
        >
          {error}
        </div>
      )}

      <form
        className="flex flex-col gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm"
        action={() =>
          mutate("request", {
            jobId,
            baseId: fromId || null,
            verifyFull: verify,
          })
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
            Repository analysis job
          </label>
          <DropdownSelect
            value={jobId}
            options={jobOptions}
            searchable
            placeholder="Select a recent analysis job…"
            onChange={setJobId}
          />
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dotted border-neutral-300 bg-white/60 p-3 text-xs text-neutral-900">
          <input
            className="mt-0.5 rounded accent-neutral-400"
            type="checkbox"
            checked={verify}
            onChange={(e) => setVerify(e.target.checked)}
          />
          <span className="leading-relaxed">
            Verify incremental AST cache against full re-analysis. Protects
            against cache pollution across sub-branches.
          </span>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <CandyButton
            type="submit"
            variant="pearl"
            size="default"
            disabled={busy || !jobId}
          >
            Analyze version
          </CandyButton>
        </div>
      </form>

      <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold tracking-wider text-neutral-900 uppercase">
          Diff Baseline & Target
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
              Before snapshot (Baseline)
            </label>
            <DropdownSelect
              value={fromId}
              options={snapshotOptions}
              searchable
              placeholder="Select baseline snapshot…"
              onChange={(val) => {
                setFromId(val);
                setRequested("");
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
              After snapshot (Target)
            </label>
            <DropdownSelect
              value={toId}
              options={snapshotOptions}
              searchable
              placeholder="Select target snapshot…"
              onChange={(val) => {
                setToId(val);
                setRequested("");
              }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-dotted border-neutral-300 pt-2">
          <CandyButton
            type="button"
            variant="pearl"
            size="default"
            disabled={busy || !fromId || !toId || fromId === toId}
            onClick={() => mutate("compare", { fromId, toId })}
          >
            Compare architecture versions
          </CandyButton>

          <div className="flex items-center gap-2">
            <CandyButton
              type="button"
              variant="secondary"
              size="xs"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ← Previous
            </CandyButton>
            <span className="font-mono text-xs text-neutral-600">
              Page {page}
            </span>
            <CandyButton
              type="button"
              variant="secondary"
              size="xs"
              disabled={(versions.data?.snapshots.length ?? 0) < 20}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </CandyButton>
          </div>
        </div>
      </section>

      {overview.data && (
        <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-4">
            <h2 className="text-base font-bold text-neutral-950">
              Snapshot metadata ·{" "}
              <span className="font-mono text-xs text-neutral-900">
                {status}
              </span>
            </h2>
            <span className="font-mono text-xs text-neutral-600">
              SHA: {overview.data.snapshot.commitSha.slice(0, 12)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-dotted border-neutral-300 bg-white/60 p-3">
              <span className="mb-1 block text-neutral-600">
                Indexed Symbols
              </span>
              <span className="font-semibold text-neutral-950">
                {overview.data.symbols}
              </span>
            </div>
            <div className="rounded-xl border border-dotted border-neutral-300 bg-white/60 p-3">
              <span className="mb-1 block text-neutral-600">Relationships</span>
              <span className="font-semibold text-neutral-950">
                {overview.data.relationships}
              </span>
            </div>
            <div className="rounded-xl border border-dotted border-neutral-300 bg-white/60 p-3">
              <span className="mb-1 block text-neutral-600">
                Schema Objects
              </span>
              <span className="font-semibold text-neutral-950">
                {overview.data.schemaObjects}
              </span>
            </div>
            <div className="rounded-xl border border-dotted border-neutral-300 bg-white/60 p-3">
              <span className="mb-1 block text-neutral-600">Diagnostics</span>
              <span className="font-semibold text-neutral-950">
                {overview.data.diagnostics}
              </span>
            </div>
          </div>
        </section>
      )}

      {comparisonId && (
        <ComparisonResults
          key={comparisonId}
          workspaceId={workspaceId}
          comparisonId={comparisonId}
          onSelect={setComparisonId}
          refresh={refresh}
        />
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-bold tracking-wider text-neutral-900 uppercase">
          Enforce Branch Push Policy
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="h-9 rounded-lg border border-dotted border-neutral-300 bg-white px-3 font-mono text-xs text-neutral-950 placeholder-neutral-600 outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. refs/heads/main"
          />
          <CandyButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={busy || !ref.trim()}
            onClick={() =>
              mutate("policy", { ref, policy: "require-clean-diff" })
            }
          >
            Save push policy
          </CandyButton>
        </div>
      </section>
    </div>
  );
}
