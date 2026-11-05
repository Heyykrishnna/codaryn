"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { ExecutionExplorer } from "@/src/features/execution-explorer/explorer";
export default function ExecutionPage() {
  return (
    <WorkspaceExplorer title="Execution Explorer">
      {(workspaceId) => (
        <ExecutionExplorer key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
