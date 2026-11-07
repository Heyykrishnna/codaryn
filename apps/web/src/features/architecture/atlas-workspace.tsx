"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  architectureAtlasSchema,
  atlasJobListSchema,
} from "@codaryn/contracts";
import { useArtifactResource } from "@/src/lib/artifact-resource";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import { CandyButton } from "@/src/components/ui/candy-button";
import {
  fetchRepositoryCatalog,
  type Repository,
} from "@/src/features/repositories/api";
import { GraphExplorer } from "@/src/features/graph/explorer";
import { AtlasView } from "./atlas-view";

export function AtlasWorkspace({
  workspaceId,
  initialJobId,
}: {
  workspaceId: string;
  initialJobId?: string;
}) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [repositoryError, setRepositoryError] = useState(false);
  const [repositoryId, setRepositoryId] = useState("");
  const [jobId, setJobId] = useState(initialJobId ?? "");
  const [baselineId, setBaselineId] = useState("");
  const [jobRevision, setJobRevision] = useState(0);
  const [atlasRevision, setAtlasRevision] = useState(0);
  const [showDependencies, setShowDependencies] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchRepositoryCatalog(workspaceId, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setRepositories(items);
      })
      .catch(() => {
        if (!controller.signal.aborted) setRepositoryError(true);
      });
    return () => controller.abort();
  }, [workspaceId]);

  const query = new URLSearchParams({
    workspaceId,
    refresh: String(jobRevision),
  });
  if (repositoryId) query.set("repositoryId", repositoryId);
  if (initialJobId && jobId === initialJobId) query.set("jobId", initialJobId);
  const jobs = useArtifactResource(
    `/api/v1/analysis/jobs?${query}`,
    atlasJobListSchema,
  );
  const available = jobs.data?.jobs ?? [];
  const current = jobId
    ? available.find((job) => job.id === jobId)
    : (available.find((job) => job.status === "completed") ?? available[0]);
  const status = current?.status;
  const baseline = available.find(
    (job) =>
      job.id === baselineId &&
      job.status === "completed" &&
      job.repositoryId === current?.repositoryId &&
      job.id !== current.id,
  );
  const snapshotUrl = (id: string) =>
    `/api/v1/workspaces/${workspaceId}/analysis/${id}/atlas?refresh=${atlasRevision}`;
  const atlas = useArtifactResource(
    current && status === "completed" ? snapshotUrl(current.id) : null,
    architectureAtlasSchema,
  );
  const base = useArtifactResource(
    baseline ? snapshotUrl(baseline.id) : null,
    architectureAtlasSchema,
  );

  useEffect(() => {
    if (status !== "queued" && status !== "running") return;
    const timer = setTimeout(() => setJobRevision((value) => value + 1), 5000);
    return () => clearTimeout(timer);
  }, [status, jobRevision]);

  const options = available.map((job) => ({
    value: job.id,
    label: `${job.repositoryName} · ${job.commitSha.slice(0, 8)}`,
    description: `${job.ref} · ${job.status}`,
  }));

  return (
    <div className="min-w-0 space-y-5">
      <div className="border-border bg-card grid gap-3 rounded-xl border border-dotted p-4 sm:grid-cols-3">
        <div className="min-w-0 space-y-1.5">
          <p className="text-muted text-xs">Repository</p>
          <DropdownSelect
            label="Repository"
            searchable
            value={repositoryId}
            options={[
              { value: "", label: "All workspace repositories" },
              ...repositories.map((repository) => ({
                value: repository.id,
                label: repository.fullName,
              })),
            ]}
            onChange={(value) => {
              setRepositoryId(value);
              setJobId("");
              setBaselineId("");
              setShowDependencies(false);
            }}
          />
          {repositoryError && (
            <p role="alert" className="text-muted text-xs">
              Repository catalog unavailable. Recent snapshots remain available.
            </p>
          )}
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-muted text-xs">Analysis snapshot</p>
          <DropdownSelect
            label="Analysis snapshot"
            searchable
            value={current?.id ?? ""}
            options={options}
            placeholder="Select an analysis"
            onChange={(value) => {
              setJobId(value);
              setBaselineId("");
              setShowDependencies(false);
            }}
          />
        </div>
        <div className="min-w-0 space-y-1.5">
          <p className="text-muted text-xs">Baseline</p>
          <DropdownSelect
            label="Baseline"
            searchable
            value={baseline?.id ?? ""}
            options={[
              { value: "", label: "No baseline" },
              ...options.filter((option) =>
                available.some(
                  (job) =>
                    job.id === option.value &&
                    job.repositoryId === current?.repositoryId &&
                    job.status === "completed" &&
                    job.id !== current.id,
                ),
              ),
            ]}
            onChange={setBaselineId}
          />
        </div>
      </div>
      {(jobs.loading || atlas.loading || base.loading) && (
        <LoadingIndicator
          label={
            jobs.loading
              ? "Loading analysis runs…"
              : base.loading
                ? "Loading baseline…"
                : "Building architecture views…"
          }
        />
      )}
      {(jobs.error || atlas.error || base.error) && (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
          <p>{jobs.error || atlas.error || base.error}</p>
          <CandyButton
            size="sm"
            onClick={() => {
              setJobRevision((value) => value + 1);
              setAtlasRevision((value) => value + 1);
            }}
          >
            Retry
          </CandyButton>
        </div>
      )}
      {!jobs.loading && !jobs.error && !current && (
        <section className="border-border bg-card space-y-3 rounded-xl border border-dotted p-5">
          <h2 className="font-semibold">
            {jobId ? "Analysis run unavailable" : "No analysis runs yet"}
          </h2>
          <p className="text-muted text-sm">
            In Studio, select a repository and commit, then choose Create
            manifest and start analysis.
          </p>
          <Link href="/studio" className="text-sm underline underline-offset-4">
            Open Studio
          </Link>
          {jobId && (
            <CandyButton size="sm" onClick={() => setJobId("")}>
              Show available runs
            </CandyButton>
          )}
        </section>
      )}
      {current && status !== "completed" && (
        <section className="border-border bg-card space-y-3 rounded-xl border border-dotted p-5 text-sm">
          <h2 className="font-semibold capitalize">Analysis {status}</h2>
          <p className="text-muted">
            {status === "queued"
              ? "Waiting for the analysis worker."
              : status === "running"
                ? `Current stage: ${current.stage}.`
                : "Open the run details to inspect the outcome and available actions."}
          </p>
          <Link
            href={`/analysis?${new URLSearchParams({ workspaceId, jobId: current.id })}`}
            className="underline underline-offset-4"
          >
            View run details
          </Link>
        </section>
      )}
      {current?.status === "completed" && atlas.data && (
        <AtlasView
          key={atlas.data.jobId}
          atlas={atlas.data}
          baseline={base.data ?? undefined}
          workspaceId={workspaceId}
          refresh={() => setAtlasRevision((value) => value + 1)}
        />
      )}
      {current && status === "completed" && (
        <details
          open={showDependencies}
          onToggle={(event) => setShowDependencies(event.currentTarget.open)}
          className="border-border bg-card rounded-xl border border-dotted p-4"
        >
          <summary className="cursor-pointer text-sm font-semibold">
            Full dependency explorer
          </summary>
          {showDependencies && (
            <div className="mt-4">
              <GraphExplorer
                key={current.id}
                workspaceId={workspaceId}
                initialJobId={current.id}
              />
            </div>
          )}
        </details>
      )}
    </div>
  );
}
