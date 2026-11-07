"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Selection = { actorId: string; workspaceId: string };
const WorkspaceSelection = createContext<{
  selection: Selection | null;
  select: (value: Selection) => void;
} | null>(null);

export function WorkspaceSelectionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [selection, select] = useState<Selection | null>(null);

  return (
    <WorkspaceSelection.Provider value={{ selection, select }}>
      {children}
    </WorkspaceSelection.Provider>
  );
}

export function useWorkspaceSelection(actorId: string) {
  const context = useContext(WorkspaceSelection);
  return {
    selected:
      context?.selection?.actorId === actorId
        ? context.selection.workspaceId
        : "",
    select: (workspaceId: string) => context?.select({ actorId, workspaceId }),
  };
}
