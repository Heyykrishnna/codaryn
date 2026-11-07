"use client";
import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { SchemaStudio } from "@/src/features/schema-studio/studio";
export default function SchemaPage() {
  return (
    <WorkspaceExplorer
      title="Schema"
      description="Inspect tables, relationships, and changes between snapshots."
    >
      {(workspaceId) => (
        <SchemaStudio key={workspaceId} workspaceId={workspaceId} />
      )}
    </WorkspaceExplorer>
  );
}
