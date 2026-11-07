"use client";

import Link from "next/link";
import { dashboardSections } from "@/src/components/dashboard-sections";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { CandyButton } from "@/src/components/ui/candy-button";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import {
  overviewSchema,
  teamUrl,
  useArtifactResource,
} from "@/src/features/team/api";

const metrics = [
  ["repositories", "Repositories"],
  ["jobs", "Analysis jobs"],
  ["members", "Members"],
  ["exports", "Exports"],
] as const;

function WorkspaceSummary({
  workspaceId,
  name,
}: {
  workspaceId: string;
  name: string;
}) {
  const summary = useArtifactResource(
    teamUrl("overview", workspaceId),
    overviewSchema,
  );

  return (
    <section aria-labelledby="workspace-summary" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="workspace-summary" className="text-base font-semibold">
          {name}
        </h2>
        <CandyButton as="a" href="/repositories" variant="pearl" size="sm">
          Browse repositories
        </CandyButton>
      </div>
      {summary.loading && (
        <LoadingIndicator label="Loading workspace totals…" />
      )}
      {summary.error && (
        <p role="alert" className="text-muted text-sm">
          {summary.error}
        </p>
      )}
      {summary.data && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metrics.map(([key, label]) => (
            <div
              key={key}
              className="border-border bg-card flex flex-col gap-2 rounded-xl border border-dotted p-4"
            >
              <dt className="text-muted text-sm">{label}</dt>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                {summary.data?.counts[key]?.toLocaleString() ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

export default function OverviewPage() {
  return (
    <WorkspaceExplorer
      title="Overview"
      description="Review workspace totals and jump into your architecture tools."
      footer={<ToolDirectory />}
    >
      {(workspaceId, workspace) => (
        <WorkspaceSummary
          key={workspaceId}
          workspaceId={workspaceId}
          name={workspace.name}
        />
      )}
    </WorkspaceExplorer>
  );
}

function ToolDirectory() {
  return (
    <section aria-labelledby="dashboard-tools" className="space-y-4">
      <h2 id="dashboard-tools" className="text-base font-semibold">
        Explore tools
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {dashboardSections
          .slice(1)
          .map(({ href, label, description, icon }) => (
            <Link
              key={href}
              href={href}
              className="group border-border bg-card motion-safe:ease-control hover:bg-card-hover flex min-w-0 items-start gap-3 rounded-xl border border-dotted p-4 hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:transition-[background-color,border-color,translate] motion-safe:duration-150 motion-safe:active:translate-y-px"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted mt-0.5 size-5 shrink-0"
              >
                <path d={icon} />
              </svg>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-sm font-semibold">{label}</h3>
                <p className="text-muted text-sm leading-relaxed">
                  {description}
                </p>
              </div>
              <span
                aria-hidden="true"
                className="text-muted motion-safe:transition-transform motion-safe:group-hover:translate-x-0.5"
              >
                →
              </span>
            </Link>
          ))}
      </div>
    </section>
  );
}
