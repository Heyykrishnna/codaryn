"use client";

import { useEffect, useState } from "react";
import { qualitySummarySchema } from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
import {
  useArtifactResource,
  qualityUrl,
  jobsSchema,
  summariesSchema,
  overviewSchema,
} from "./api";
import { QualityInventory } from "./inventory";
import { SecurityDashboard } from "./security";
import { CandyButton } from "@/src/components/ui/candy-button";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";

export function QualityExplorer({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const [refresh, setRefresh] = useState(0);
  const [page, setPage] = useState(1);
  const [jobId, setJobId] = useState("");
  const [snapshotId, setSnapshotId] = useState("");
  const [external, setExternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const jobs = useArtifactResource(
    qualityUrl("jobs", workspaceId, { _retry: refresh }),
    jobsSchema,
  );
  const history = useArtifactResource(
    qualityUrl("snapshots", workspaceId, { page, _retry: refresh }),
    summariesSchema,
  );
  const overview = useArtifactResource(
    snapshotId
      ? qualityUrl("overview", workspaceId, { snapshotId, _retry: refresh })
      : null,
    overviewSchema,
  );

  const status = overview.data?.snapshot.status;

  useEffect(() => {
    if (!snapshotId || !status || !["queued", "running"].includes(status)) {
      return;
    }
    const timer = setInterval(() => setRefresh((n) => n + 1), 3000);
    return () => clearInterval(timer);
  }, [snapshotId, status]);

  const error = jobs.error || history.error || overview.error;

  const jobOptions =
    jobs.data?.jobs.map((job) => ({
      value: job.id,
      label: `${job.full_name} · ${job.ref}`,

      description: job.id,
    })) ?? [];

  const snapshotOptions =
    history.data?.snapshots.map((s) => ({
      value: s.id,
      label: `${s.commitSha.slice(0, 8)} · ${s.status}`,

      description: s.id.slice(0, 8),
    })) ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-2 rounded-xl border border-dotted border-neutral-300 bg-white p-4 text-xs text-neutral-900">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-neutral-950">
            Engineering Quality & Compliance
          </span>
          {busy && (
            <LoadingIndicator
              variant="inline"
              label="Processing quality snapshot…"
            />
          )}
        </div>
        <p className="text-neutral-600">
          Audit test assertions, coverage distributions, infrastructure
          dependencies, and security vulnerability advisories for immutable
          commits.
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

      {(jobs.loading || history.loading) && (
        <LoadingIndicator
          label="Loading quality artifacts…"
          description="Fetching recent analysis jobs and snapshot history"
        />
      )}

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-dotted border-neutral-500/30 bg-neutral-100/10 p-3 text-xs text-neutral-800"
        >
          {error}
        </div>
      )}

      <form
        className="flex flex-col gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm"
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
          } catch (err) {
            setMessage(
              err instanceof Error ? err.message : "Quality request failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-dotted border-neutral-300 bg-white p-3 text-xs text-neutral-900">
          <input
            className="mt-0.5 rounded accent-neutral-400"
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
          <span className="leading-relaxed">
            Allow OSV vulnerability lookup: query public OSV database using
            package names and resolved lockfile versions. Requires workspace
            admin privileges. Source code is never transmitted.
          </span>
        </label>

        <div className="flex items-center gap-3 pt-1">
          <CandyButton
            type="submit"
            variant="pearl"
            size="default"
            disabled={busy || !jobId}
          >
            Extract quality snapshot
          </CandyButton>
        </div>
      </form>

      <div className="flex flex-col gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
            Select quality snapshot
          </label>
          <DropdownSelect
            value={snapshotId}
            options={snapshotOptions}
            searchable
            placeholder="Select a snapshot…"
            onChange={setSnapshotId}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-2">
            <CandyButton
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setRefresh((n) => n + 1)}
            >
              Refresh
            </CandyButton>
          </div>
          <div className="flex items-center gap-2">
            <CandyButton
              type="button"
              variant="secondary"
              size="xs"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              ← Previous snapshots
            </CandyButton>
            <span className="font-mono text-xs text-neutral-600">
              Page {page}
            </span>
            <CandyButton
              type="button"
              variant="secondary"
              size="xs"
              disabled={(history.data?.snapshots.length ?? 0) < 20}
              onClick={() => setPage(page + 1)}
            >
              Next snapshots →
            </CandyButton>
          </div>
        </div>
      </div>

      {overview.loading && (
        <LoadingIndicator
          label="Loading quality overview…"
          description="Synthesizing scanner reports and test coverage"
        />
      )}

      {overview.data && (
        <section className="flex flex-col gap-6 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-dotted border-neutral-300 pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status === "completed"
                    ? "bg-neutral-800"
                    : "bg-neutral-800 motion-safe:animate-pulse"
                }`}
              />
              <h2 className="text-lg font-bold text-neutral-950">
                Quality overview ·{" "}
                <span className="font-mono text-xs uppercase">{status}</span>
              </h2>
            </div>
            <span className="max-w-xs truncate font-mono text-xs text-neutral-600">
              {overview.data.snapshot.commitSha.slice(0, 12)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1 rounded-xl border border-dotted border-neutral-300 bg-white p-4">
              <span className="text-xs text-neutral-600">Resources</span>
              <span className="font-mono text-2xl font-bold text-neutral-950">
                {overview.data.resources}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-dotted border-neutral-300 bg-white p-4">
              <span className="text-xs text-neutral-600">Tests</span>
              <span className="font-mono text-2xl font-bold text-neutral-950">
                {overview.data.tests}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-dotted border-neutral-300 bg-white p-4">
              <span className="text-xs text-neutral-600">Dependencies</span>
              <span className="font-mono text-2xl font-bold text-neutral-950">
                {overview.data.dependencies}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-dotted border-neutral-300 bg-white p-4">
              <span className="text-xs text-neutral-600">Findings</span>
              <span
                className={`font-mono text-2xl font-bold ${overview.data.findings > 0 ? "text-neutral-800" : "text-neutral-800"}`}
              >
                {overview.data.findings}
              </span>
            </div>
          </div>

          {overview.data.snapshot.failureCode && (
            <div
              role="alert"
              className="rounded-xl border border-neutral-500/20 bg-neutral-100/10 p-3 text-xs text-neutral-800"
            >
              Analysis failed: {overview.data.snapshot.failureCode}. Verify
              worker configuration and repository access before retrying.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wider text-neutral-600 uppercase">
              Configured Scanners
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {overview.data.scanners.map((scanner) => (
                <div
                  key={scanner.tool}
                  className="flex items-center justify-between rounded-xl border border-dotted border-neutral-300 bg-white px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-950">
                      {scanner.tool}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-600">
                      v{scanner.version}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-neutral-800">
                    {scanner.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {status === "completed" && overview.data && (
        <>
          <QualityInventory
            key={`inv:${snapshotId}`}
            workspaceId={workspaceId}
            snapshotId={snapshotId}
          />
          <SecurityDashboard
            key={`sec:${snapshotId}`}
            workspaceId={workspaceId}
            snapshotId={snapshotId}
            overview={overview.data}
            onReview={() => setRefresh((n) => n + 1)}
          />
          <details className="rounded-2xl border border-dotted border-neutral-300 bg-white p-5">
            <summary className="cursor-pointer text-xs font-semibold tracking-wider text-neutral-900 uppercase select-none">
              Analysis diagnostics ({overview.data.diagnosticCount})
            </summary>
            <div className="mt-4 flex flex-col gap-2">
              {overview.data.diagnostics.map((d, i) => (
                <div
                  key={`${d.code}:${i}`}
                  className="flex flex-col gap-1 rounded-xl border border-dotted border-neutral-300 bg-white/60 p-3 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-800">
                      {d.code}
                    </span>
                    <span className="text-neutral-600">
                      {d.evidence.path}:{d.evidence.startLine}
                    </span>
                  </div>
                  <p className="text-neutral-900">{d.message}</p>
                </div>
              ))}
              <p className="font-mono text-[11px] text-neutral-600">
                Showing up to 30 diagnostics.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
