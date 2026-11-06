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
import { LoaderOrb } from "@/src/components/ui/loader-orb";

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
      badge: job.commit_sha.slice(0, 8),
      description: job.id,
    })) ?? [];

  const completedSnapshots =
    versions.data?.snapshots.filter((s) => s.status === "completed") ?? [];

  const snapshotOptions = completedSnapshots.map((s) => ({
    value: s.id,
    label: `${s.commitSha.slice(0, 8)} · ${s.status}`,
    badge: s.id.slice(0, 8),
    description: s.commitSha,
  }));

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-2 rounded-xl border border-dotted border-zinc-800 bg-[#111216] p-4 text-xs text-zinc-300">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">
            Architecture Comparisons & Impact Diff
          </span>
          {busy && (
            <LoaderOrb
              variant="inline"
              label="Comparing architecture graphs…"
            />
          )}
        </div>
        <p className="text-zinc-400">
          Compare immutable codebase versions side by side. Detect broken
          contracts, new dependency cycles, and structural drift before merge.
        </p>
        {message && (
          <div
            role="alert"
            className="mt-1 rounded-lg border border-dotted border-zinc-700 bg-zinc-900 px-3 py-1.5 font-mono text-xs text-zinc-300"
          >
            {message}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
        >
          {error}
        </div>
      )}

      <form
        className="flex flex-col gap-4 rounded-2xl border border-dotted border-zinc-800 bg-[#111216] p-6 shadow-xl"
        action={() =>
          mutate("request", {
            jobId,
            baseId: fromId || null,
            verifyFull: verify,
          })
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dotted border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300">
          <input
            className="mt-0.5 rounded accent-zinc-400"
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

      <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-zinc-800 bg-[#111216] p-6 shadow-xl">
        <h2 className="text-sm font-bold tracking-wider text-zinc-300 uppercase">
          Diff Baseline & Target
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
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
            <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
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

        <div className="flex items-center justify-between border-t border-dotted border-zinc-800 pt-2">
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
            <span className="font-mono text-xs text-zinc-400">Page {page}</span>
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
        <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-zinc-800 bg-[#111216] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-dotted border-zinc-800 pb-4">
            <h2 className="text-base font-bold text-white">
              Snapshot metadata ·{" "}
              <span className="font-mono text-xs text-zinc-300">{status}</span>
            </h2>
            <span className="font-mono text-xs text-zinc-400">
              SHA: {overview.data.snapshot.commitSha.slice(0, 12)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-dotted border-zinc-800 bg-zinc-900/60 p-3">
              <span className="mb-1 block text-zinc-500">Indexed Symbols</span>
              <span className="font-semibold text-white">
                {overview.data.symbols}
              </span>
            </div>
            <div className="rounded-xl border border-dotted border-zinc-800 bg-zinc-900/60 p-3">
              <span className="mb-1 block text-zinc-500">Relationships</span>
              <span className="font-semibold text-white">
                {overview.data.relationships}
              </span>
            </div>
            <div className="rounded-xl border border-dotted border-zinc-800 bg-zinc-900/60 p-3">
              <span className="mb-1 block text-zinc-500">Schema Objects</span>
              <span className="font-semibold text-white">
                {overview.data.schemaObjects}
              </span>
            </div>
            <div className="rounded-xl border border-dotted border-zinc-800 bg-zinc-900/60 p-3">
              <span className="mb-1 block text-zinc-500">Diagnostics</span>
              <span className="font-semibold text-white">
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

      <section className="flex flex-col gap-4 rounded-2xl border border-dotted border-zinc-800 bg-[#111216] p-6 shadow-xl">
        <h2 className="text-sm font-bold tracking-wider text-zinc-300 uppercase">
          Enforce Branch Push Policy
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="h-9 rounded-lg border border-dotted border-zinc-700 bg-zinc-900 px-3 font-mono text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-400"
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
