"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { SchemaStudio } from "@/src/features/schema-studio/studio";
export default function SchemaPage() {
  return (
    <WorkspaceExplorer title="Schema Studio">
      {(workspaceId) => (
        <SchemaStudio key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
