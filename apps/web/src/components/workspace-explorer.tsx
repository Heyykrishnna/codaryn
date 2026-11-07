"use client";

import { useEffect, useState, type ReactNode } from "react";
import { workspaceListSchema, type WorkspaceSummary } from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { CandyButton } from "@/src/components/ui/candy-button";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { useWorkspaceSelection } from "./workspace-selection";
import { DashboardHeading, DashboardPage } from "./dashboard-page";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";

export function WorkspaceExplorer({
  title,
  description,
  footer,
  children,
  initialWorkspaceId,
}: Readonly<{
  title: string;
  description?: string;
  footer?: ReactNode;
  initialWorkspaceId?: string;
  children: (workspaceId: string, workspace: WorkspaceSummary) => ReactNode;
}>) {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) {
    return (
      <DashboardPage>
        <DashboardHeading title={title} description={description} />
        <LoadingIndicator
          label={`Connecting to ${title}…`}
          description="Verifying authorization and active workspace resources"
        />
      </DashboardPage>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-2xl border border-dotted border-neutral-500/30 bg-neutral-100/10 p-6 text-sm text-neutral-800">
          <p className="mb-1 font-semibold text-neutral-950">
            Session verification failed
          </p>
          <p>Unable to verify your account session. Please reload to retry.</p>
        </div>
        <CandyButton
          onClick={() => window.location.reload()}
          variant="obsidian"
          size="sm"
        >
          Reload page
        </CandyButton>
      </main>
    );
  }

  if (!session) {
    return (
      <DashboardPage>
        <DashboardHeading title={title} description={description} />
        <section className="border-border bg-card space-y-3 rounded-xl border border-dotted p-5">
          <h2 className="text-base font-semibold">Sign in to your workspace</h2>
          <p className="text-muted text-sm">
            Sign in to load your repositories and analysis data.
          </p>
          <CandyButton as="a" href="/workspace" variant="pearl" size="sm">
            Go to sign in
          </CandyButton>
        </section>
        {footer}
      </DashboardPage>
    );
  }

  return (
    <WorkspaceExplorerContent
      key={`${session.user.id}:${initialWorkspaceId ?? ""}`}
      actorId={session.user.id}
      title={title}
      description={description}
      footer={footer}
      initialWorkspaceId={initialWorkspaceId}
    >
      {children}
    </WorkspaceExplorerContent>
  );
}

function WorkspaceExplorerContent({
  actorId,
  title,
  description,
  footer,
  children,
  initialWorkspaceId,
}: Readonly<{
  actorId: string;
  title: string;
  description?: string;
  footer?: ReactNode;
  initialWorkspaceId?: string;
  children: (workspaceId: string, workspace: WorkspaceSummary) => ReactNode;
}>) {
  const [data, setData] = useState<{
    items: WorkspaceSummary[];
    active: string;
  } | null>(null);
  const { selected, select } = useWorkspaceSelection(actorId);
  const [localSelection, setLocalSelection] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/workspace/list", {
      cache: "no-store",
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30000)]),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Workspace access unavailable");
        const result = workspaceListSchema.parse(await response.json());
        if (controller.signal.aborted) return;
        setData({ items: result.workspaces, active: result.active ?? "" });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessage("Unable to load workspaces. Reload to retry.");
        }
      });
    return () => controller.abort();
  }, []);

  const preferred = localSelection || initialWorkspaceId || selected;
  const workspace =
    data?.items.find((item) => item.id === preferred) ??
    data?.items.find((item) => item.id === data.active) ??
    data?.items[0];
  const options =
    data?.items.map((item) => ({ value: item.id, label: item.name })) ?? [];

  return (
    <DashboardPage>
      <DashboardHeading title={title} description={description}>
        {options.length > 0 && (
          <DropdownSelect
            label="Workspace"
            value={workspace?.id ?? ""}
            options={options}
            onChange={(id) => {
              setLocalSelection(id);
              select(id);
            }}
            placeholder="Select a workspace…"
            searchable
          />
        )}
      </DashboardHeading>

      {message && (
        <div
          role="alert"
          className="rounded-xl border border-dotted border-neutral-500/30 bg-neutral-100/10 px-4 py-3 text-xs text-neutral-800"
        >
          {message}
        </div>
      )}

      {!data && !message && (
        <div className="py-12">
          <LoadingIndicator
            label="Loading workspaces…"
            description="Fetching repository and schema boundaries"
          />
        </div>
      )}

      {data && !data.items.length && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dotted border-neutral-300 bg-white p-12 text-center">
          <h2 className="text-lg font-semibold text-neutral-950">
            No active workspaces
          </h2>
          <p className="max-w-md text-xs text-neutral-600">
            Create or join a workspace to begin mapping architectural
            dependencies, symbol coverage, and execution traces.
          </p>
          <CandyButton as="a" href="/workspace" variant="pearl" size="sm">
            Create workspace
          </CandyButton>
        </div>
      )}

      {workspace && children(workspace.id, workspace)}
      {footer}
    </DashboardPage>
  );
}

export default WorkspaceExplorer;
