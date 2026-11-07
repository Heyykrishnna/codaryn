"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { ExecutionExplorer } from "@/src/features/execution-explorer/explorer";
export default function ExecutionPage() {
  return (
    <WorkspaceExplorer
      title="Execution"
      description="Follow call paths and inspect evidence from a selected analysis."
    >
      {(workspaceId) => (
        <ExecutionExplorer key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
