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
import { LoaderOrb } from "@/src/components/ui/loader-orb";

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
      badge: job.commit_sha.slice(0, 8),
      description: job.id,
    })) ?? [];

  const snapshotOptions =
    history.data?.snapshots.map((s) => ({
      value: s.id,
      label: `${s.commitSha.slice(0, 8)} · ${s.status}`,
      badge: `${s.findingCount} findings`,
      description: s.id.slice(0, 8),
    })) ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <div className="flex flex-col gap-2 rounded-xl border border-[#232734] bg-[#14161f] p-4 text-xs text-zinc-300">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">
            Engineering Quality & Compliance
          </span>
          {busy && (
            <LoaderOrb variant="inline" label="Processing quality snapshot…" />
          )}
        </div>
        <p className="text-zinc-400">
          Audit test assertions, coverage distributions, infrastructure
          dependencies, and security vulnerability advisories for immutable
          commits.
        </p>
        {message && (
          <div
            role="alert"
            className="mt-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 font-mono text-xs text-blue-300"
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
        className="flex flex-col gap-4 rounded-2xl border border-[#242835] bg-[#13151d] p-6 shadow-xl"
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

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#232734] bg-[#161821] p-3 text-xs text-zinc-300">
          <input
            className="mt-0.5 rounded accent-blue-600"
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

      <div className="flex flex-col gap-4 rounded-2xl border border-[#242835] bg-[#13151d] p-6 shadow-xl">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
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
            <span className="font-mono text-xs text-zinc-400">Page {page}</span>
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
        <LoaderOrb
          label="Loading quality overview…"
          description="Synthesizing scanner reports and test coverage"
        />
      )}

      {overview.data && (
        <section className="flex flex-col gap-6 rounded-2xl border border-[#242835] bg-[#13151d] p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#222532] pb-4">
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  status === "completed"
                    ? "bg-emerald-500"
                    : "animate-pulse bg-amber-500"
                }`}
              />
              <h2 className="text-lg font-bold text-white">
                Quality overview ·{" "}
                <span className="font-mono text-xs uppercase">{status}</span>
              </h2>
            </div>
            <span className="max-w-xs truncate font-mono text-xs text-zinc-400">
              {overview.data.snapshot.commitSha.slice(0, 12)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1 rounded-xl border border-[#252936] bg-[#161821] p-4">
              <span className="text-xs text-zinc-400">Resources</span>
              <span className="font-mono text-2xl font-bold text-white">
                {overview.data.resources}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-[#252936] bg-[#161821] p-4">
              <span className="text-xs text-zinc-400">Tests</span>
              <span className="font-mono text-2xl font-bold text-white">
                {overview.data.tests}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-[#252936] bg-[#161821] p-4">
              <span className="text-xs text-zinc-400">Dependencies</span>
              <span className="font-mono text-2xl font-bold text-white">
                {overview.data.dependencies}
              </span>
            </div>
            <div className="flex flex-col gap-1 rounded-xl border border-[#252936] bg-[#161821] p-4">
              <span className="text-xs text-zinc-400">Findings</span>
              <span
                className={`font-mono text-2xl font-bold ${overview.data.findings > 0 ? "text-amber-400" : "text-emerald-400"}`}
              >
                {overview.data.findings}
              </span>
            </div>
          </div>

          {overview.data.snapshot.failureCode && (
            <div
              role="alert"
              className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300"
            >
              Analysis failed: {overview.data.snapshot.failureCode}. Verify
              worker configuration and repository access before retrying.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Configured Scanners
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {overview.data.scanners.map((scanner) => (
                <div
                  key={scanner.tool}
                  className="flex items-center justify-between rounded-xl border border-[#252936] bg-[#161821] px-3.5 py-2.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {scanner.tool}
                    </span>
                    <span className="font-mono text-[11px] text-zinc-500">
                      v{scanner.version}
                    </span>
                  </div>
                  <span className="rounded border border-emerald-500/20 bg-[#202431] px-2 py-0.5 font-mono text-[10px] text-emerald-400">
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
          <details className="rounded-2xl border border-[#242835] bg-[#13151d] p-5">
            <summary className="cursor-pointer text-xs font-semibold tracking-wider text-zinc-300 uppercase select-none">
              Analysis diagnostics ({overview.data.diagnosticCount})
            </summary>
            <div className="mt-4 flex flex-col gap-2">
              {overview.data.diagnostics.map((d, i) => (
                <div
                  key={`${d.code}:${i}`}
                  className="flex flex-col gap-1 rounded-xl border border-[#222632] bg-[#161821] p-3 font-mono text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-400">
                      {d.code}
                    </span>
                    <span className="text-zinc-500">
                      {d.evidence.path}:{d.evidence.startLine}
                    </span>
                  </div>
                  <p className="text-zinc-300">{d.message}</p>
                </div>
              ))}
              <p className="font-mono text-[11px] text-zinc-500">
                Showing up to 30 diagnostics.
              </p>
            </div>
          </details>
        </>
      )}
    </div>
  );
}
