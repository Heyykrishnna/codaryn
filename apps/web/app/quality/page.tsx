"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { QualityExplorer } from "@/src/features/quality-explorer/explorer";
export default function QualityPage() {
  return (
    <WorkspaceExplorer title="Engineering Quality">
      {(workspaceId) => (
        <QualityExplorer key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
