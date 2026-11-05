"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { GraphExplorer } from "@/src/features/graph/explorer";
function LinkedGraph() {
  const params = useSearchParams(),
    workspace = z.uuid().safeParse(params.get("workspaceId")),
    job = z.uuid().safeParse(params.get("jobId")),
    initialWorkspaceId = workspace.success ? workspace.data : undefined,
    initialJobId = job.success ? job.data : undefined;
  return (
    <WorkspaceExplorer
      title="Dependency Graph"
      initialWorkspaceId={initialWorkspaceId}
    >
      {(workspaceId) => (
        <GraphExplorer
          key={`${workspaceId}:${initialJobId ?? ""}`}
          workspaceId={workspaceId}
          initialJobId={
            !initialWorkspaceId || workspaceId === initialWorkspaceId
              ? initialJobId
              : undefined
          }
        />
      )}
    </WorkspaceExplorer>
  );
}
export default function GraphPage() {
  return (
    <Suspense fallback={<output>Loading dependency graph…</output>}>
      <LinkedGraph />
    </Suspense>
  );
}
