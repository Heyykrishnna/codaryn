"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { GraphExplorer } from "@/src/features/graph/explorer";
import { TelemetryDashboard } from "@/src/features/graph/telemetry-dashboard";
import { CandyButton } from "@/src/components/ui/candy-button";
import { LoaderOrb } from "@/src/components/ui/loader-orb";

function LinkedGraph() {
  const params = useSearchParams();
  const workspace = z.uuid().safeParse(params.get("workspaceId"));
  const job = z.uuid().safeParse(params.get("jobId"));
  const initialWorkspaceId = workspace.success ? workspace.data : undefined;
  const initialJobId = job.success ? job.data : undefined;
  const [viewMode, setViewMode] = useState<"graph" | "telemetry">("graph");

  return (
    <WorkspaceExplorer
      title="Dependency Graph"
      initialWorkspaceId={initialWorkspaceId}
    >
      {(workspaceId) => (
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <CandyButton
              type="button"
              variant={viewMode === "graph" ? "pearl" : "secondary"}
              size="sm"
              onClick={() => setViewMode("graph")}
            >
              Topological Graph
            </CandyButton>
            <CandyButton
              type="button"
              variant={viewMode === "telemetry" ? "pearl" : "secondary"}
              size="sm"
              onClick={() => setViewMode("telemetry")}
            >
              Telemetry &amp; Cohorts
            </CandyButton>
          </div>

          {viewMode === "graph" ? (
            <GraphExplorer
              key={`${workspaceId}:${initialJobId ?? ""}`}
              workspaceId={workspaceId}
              initialJobId={
                !initialWorkspaceId || workspaceId === initialWorkspaceId
                  ? initialJobId
                  : undefined
              }
            />
          ) : (
            <TelemetryDashboard />
          )}
        </div>
      )}
    </WorkspaceExplorer>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-16">
          <LoaderOrb
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
