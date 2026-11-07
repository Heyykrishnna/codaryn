"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { ComparisonExplorer } from "@/src/features/comparisons/explorer";
export default function ComparisonPage() {
  return (
    <WorkspaceExplorer
      title="Comparisons"
      description="Compare two analysis runs and review what changed."
    >
      {(workspaceId) => (
        <ComparisonExplorer key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
