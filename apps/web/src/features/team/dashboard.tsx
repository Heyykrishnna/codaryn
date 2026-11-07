"use client";
import { useState } from "react";
import { control } from "@/src/features/repositories/api";
import {
  teamUrl,
  useArtifactResource,
  overviewSchema,
  activitySchema,
  usageSchema,
} from "./api";
import { TeamMembers } from "./members";
import { TeamControls } from "./controls";
import { TeamCatalog } from "./catalog";
export function TeamDashboard({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const [refresh, setRefresh] = useState(0),
    [page, setPage] = useState(1),
    overview = useArtifactResource(
      teamUrl("overview", workspaceId, { _retry: refresh }),
      overviewSchema,
    ),
    activity = useArtifactResource(
      teamUrl("activity", workspaceId, { page, _retry: refresh }),
      activitySchema,
    ),
    usage = useArtifactResource(
      teamUrl("usage", workspaceId, { _retry: refresh }),
      usageSchema,
    ),
    changed = () => setRefresh((n) => n + 1);
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p>
        Manage team access, recipient-bound architecture sharing, immutable
        exports and reviewed retention. Authorization is enforced on every
        server request.
      </p>
      <button className={`${control} self-start`} onClick={changed}>
        Refresh workspace data
      </button>
      {overview.loading && <output>Loading organization dashboard…</output>}
      {overview.error && <p role="alert">{overview.error}</p>}
      {overview.data && (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            {Object.entries(overview.data.counts).map(([name, count]) => (
              <div
                key={name}
                className="rounded-lg border border-dotted border-neutral-300 p-4"
              >
                <p className="text-sm">{name}</p>
                <p className="text-2xl font-semibold">
                  {count.toLocaleString()}
                </p>
              </div>
            ))}
          </section>
          <p>
            Your role: {overview.data.role}. Counts show current stored
            inventory; usage below records collaboration events for the last 90
            days.
          </p>
          <TeamMembers
            workspaceId={workspaceId}
            canManage={overview.data.permissions.manageMembers}
            refresh={refresh}
            onChange={changed}
          />
          <TeamCatalog
            actorId={overview.data.actorId}
            workspaceId={workspaceId}
            canShare={overview.data.permissions.shareAnalysis}
            canExport={overview.data.permissions.exportAnalysis}
            canPresets={overview.data.permissions.managePresets}
            refresh={refresh}
            onChange={changed}
          />
          {overview.data.permissions.manageWorkspace && (
            <TeamControls
              key={overview.data.controls.revision}
              workspaceId={workspaceId}
              settings={overview.data.controls}
              onChange={changed}
            />
          )}
        </>
      )}
      <section>
        <h2 className="text-xl font-semibold">Usage · last 90 days</h2>
        {usage.error && <p role="alert">{usage.error}</p>}
        {usage.loading && <output>Loading usage…</output>}
        <ul>
          {usage.data?.items.map((item) => (
            <li key={`${item.day}:${item.metric}`}>
              {item.day} · {item.metric}: {item.count}
            </li>
          ))}
        </ul>
        {usage.data && !usage.data.items.length && (
          <p>No collaboration usage recorded in this window.</p>
        )}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Activity timeline</h2>
        <p>
          Administrators see workspace events. Members see their own activity.
          Tokens, source bodies and sensitive request payloads are excluded.
        </p>
        {activity.error && <p role="alert">{activity.error}</p>}
        {activity.loading && <output>Loading activity…</output>}
        <ol className="flex flex-col gap-2">
          {activity.data?.items.map((item) => (
            <li key={item.id} className="min-w-0 text-sm break-words">
              <time dateTime={item.createdAt}>
                {new Date(item.createdAt).toLocaleString()}
              </time>{" "}
              · {item.action} · actor {item.actorId} · {item.targetId}
            </li>
          ))}
        </ol>
        {activity.data && !activity.data.items.length && (
          <p>No activity on this page.</p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            className={control}
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous activity
          </button>
          <button
            className={control}
            disabled={(activity.data?.items.length ?? 0) < 50}
            onClick={() => setPage(page + 1)}
          >
            Next activity
          </button>
        </div>
      </section>
    </div>
  );
}
