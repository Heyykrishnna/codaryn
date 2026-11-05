"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { workspaceListSchema, type WorkspaceSummary } from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { CandyButton } from "@/src/components/ui/candy-button";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { LoaderOrb } from "@/src/components/ui/loader-orb";

export function WorkspaceExplorer({
  title,
  children,
  initialWorkspaceId,
}: Readonly<{
  title: string;
  initialWorkspaceId?: string;
  children: (workspaceId: string) => ReactNode;
}>) {
  const { data: session, isPending, error } = authClient.useSession();

  if (isPending) {
    return (
      <main className="mx-auto flex max-w-7xl flex-col items-center justify-center min-h-[60vh] px-6 py-12">
        <LoaderOrb
          label={`Connecting to ${title}…`}
          description="Verifying authorization and active workspace resources"
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-md flex-col items-center justify-center min-h-[50vh] gap-4 p-8 text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
          <p className="font-semibold text-white mb-1">Session verification failed</p>
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
      <main className="mx-auto flex max-w-md flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2b2f3d] bg-[#14161f] text-blue-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-white">Sign in required</h1>
          <p className="text-sm text-zinc-400">
            Sign in to your account to explore {title} and inspect architecture evidence.
          </p>
        </div>
        <CandyButton as="a" href="/workspace" variant="pearl" size="default">
          Go to sign in
        </CandyButton>
      </main>
    );
  }

  return (
    <WorkspaceExplorerContent
      key={`${session.user.id}:${initialWorkspaceId ?? ""}`}
      title={title}
      initialWorkspaceId={initialWorkspaceId}
    >
      {children}
    </WorkspaceExplorerContent>
  );
}

function WorkspaceExplorerContent({
  title,
  children,
  initialWorkspaceId,
}: Readonly<{
  title: string;
  initialWorkspaceId?: string;
  children: (workspaceId: string) => ReactNode;
}>) {
  const [data, setData] = useState<{
    items: WorkspaceSummary[];
    active: string;
  } | null>(null);
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/workspace/list", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Workspace access unavailable");
        const result = workspaceListSchema.parse(await response.json());
        setData({
          items: result.workspaces,
          active: result.workspaces.some(
            (item) => item.id === initialWorkspaceId,
          )
            ? (initialWorkspaceId ?? "")
            : (result.active ?? result.workspaces[0]?.id ?? ""),
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setMessage("Unable to load workspaces. Reload to retry.");
        }
      });
    return () => controller.abort();
  }, [initialWorkspaceId]);

  const workspace = selected || data?.active || "";

  const options =
    data?.items.map((item) => ({
      value: item.id,
      label: item.name,
      badge: item.role,
      description: item.id,
    })) ?? [];

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-[#232733] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <Link href="/" className="hover:text-zinc-300 transition-colors">
              codaryn
            </Link>
            <span>/</span>
            <span className="text-zinc-300">{title}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {data && data.items.length > 0 && (
            <div className="w-64 sm:w-72">
              <DropdownSelect
                value={workspace}
                options={options}
                onChange={setSelected}
                placeholder="Select a workspace…"
                searchable
              />
            </div>
          )}

          <CandyButton
            as="a"
            href="/workspace"
            variant="obsidian"
            size="sm"
            title="Workspace settings"
          >
            Settings
          </CandyButton>
        </div>
      </div>

      {message && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs text-red-300"
        >
          {message}
        </div>
      )}

      {!data && !message && (
        <div className="py-12">
          <LoaderOrb
            label="Loading workspaces…"
            description="Fetching repository and schema boundaries"
          />
        </div>
      )}

      {data && !data.items.length && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#232734] bg-[#14161f] p-12 text-center">
          <h2 className="text-lg font-semibold text-white">No active workspaces</h2>
          <p className="max-w-md text-xs text-zinc-400">
            Create or join a workspace to begin mapping architectural dependencies,
            symbol coverage, and execution traces.
          </p>
          <CandyButton as="a" href="/workspace" variant="pearl" size="sm">
            Create workspace
          </CandyButton>
        </div>
      )}

      {workspace && children(workspace)}
    </main>
  );
}

export default WorkspaceExplorer;
