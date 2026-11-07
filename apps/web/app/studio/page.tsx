"use client";

import { WorkspaceExplorer } from "@/src/components/workspace-explorer";
import { Studio } from "@/src/features/analysis-studio/studio";

export default function StudioPage() {
  return (
    <WorkspaceExplorer
      title="Studio"
      description="Choose a repository and revision, then configure your analysis."
    >
      {(_, workspace) => <Studio key={workspace.id} workspace={workspace} />}
    </WorkspaceExplorer>
  );
}
