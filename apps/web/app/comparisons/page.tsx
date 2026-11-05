"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { ComparisonExplorer } from "@/src/features/comparisons/explorer";
export default function ComparisonPage() {
  return (
    <WorkspaceExplorer title="Architecture Comparison">
      {(workspaceId) => (
        <ComparisonExplorer key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
