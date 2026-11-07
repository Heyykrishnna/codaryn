"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { QualityExplorer } from "@/src/features/quality-explorer/explorer";
export default function QualityPage() {
  return (
    <WorkspaceExplorer
      title="Quality"
      description="Inspect coverage, dependency inventory, and security findings."
    >
      {(workspaceId) => (
        <QualityExplorer key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
