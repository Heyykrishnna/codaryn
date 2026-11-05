"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { TeamDashboard } from "@/src/features/team/dashboard";
export default function TeamPage() {
  return (
    <WorkspaceExplorer title="Organization Dashboard">
      {(workspaceId) => (
        <TeamDashboard key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
