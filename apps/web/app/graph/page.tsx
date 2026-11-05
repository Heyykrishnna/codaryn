"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { GraphExplorer } from "@/src/features/graph/explorer";
export default function GraphPage() {
  return (
    <WorkspaceExplorer title="Dependency Graph">
      {(workspaceId) => (
        <GraphExplorer key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
