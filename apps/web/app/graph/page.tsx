"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { GraphExplorer } from "@/src/features/graph/explorer";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";

function LinkedGraph() {
  const params = useSearchParams();
  const workspace = z.uuid().safeParse(params.get("workspaceId"));
  const job = z.uuid().safeParse(params.get("jobId"));
  const initialWorkspaceId = workspace.success ? workspace.data : undefined;
  const initialJobId = job.success ? job.data : undefined;
  return (
    <WorkspaceExplorer
      title="Graph"
      description="Explore dependencies, cycles, and the evidence behind each connection."
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
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <LoadingIndicator
            label="Loading dependency graph…"
            description="Computing topological node depth and bounding limits"
          />
        </div>
      }
    >
      <LinkedGraph />
    </Suspense>
  );
}
