"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { workspaceListSchema, type WorkspaceSummary } from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { Studio } from "@/src/features/analysis-studio/studio";
import { AIQueryConsole } from "@/src/features/analysis-studio/ai-query-console";
import { CandyButton } from "@/src/components/ui/candy-button";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { LoaderOrb } from "@/src/components/ui/loader-orb";

export default function StudioPage() {
  const { data: session, isPending, error } = authClient.useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [message, setMessage] = useState("");
  const [showConsole, setShowConsole] = useState(true);

  useEffect(() => {
    if (!session) return;
    let current = true;
    fetch("/api/v1/workspace/list", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load workspaces");
        const list = workspaceListSchema.parse(await response.json());
        if (current) {
          setWorkspaces(list.workspaces);
          setWorkspaceId(list.active ?? list.workspaces[0]?.id ?? "");
        }
      })
      .catch(() => {
        if (current) setMessage("Unable to load workspaces. Reload to retry.");
      });
    return () => {
      current = false;
    };
  }, [session]);

  if (isPending) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl flex-col items-center justify-center px-6 py-12">
        <LoaderOrb
          label="Connecting to Analysis Studio…"
          description="Initializing workspace session and analyzer manifests"
        />
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">
          <p className="mb-1 font-semibold text-white">
            Session verification failed
          </p>
          <p>Unable to verify your session. Please reload to retry.</p>
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
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2b2f3d] bg-[#14161f] text-blue-400">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-xl font-bold text-white">Sign in required</h1>
          <p className="text-sm text-zinc-400">
            Sign in with your account to configure static analysis manifests and
            run code graph pipelines.
          </p>
        </div>
        <CandyButton as="a" href="/workspace" variant="pearl" size="default">
          Go to sign in
        </CandyButton>
      </main>
    );
  }

  const workspace = workspaces.find((item) => item.id === workspaceId);

  const workspaceOptions = workspaces.map((item) => ({
    value: item.id,
    label: item.name,
    badge: item.role,
    description: item.id,
  }));

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 border-b border-[#232733] pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
            <Link href="/" className="transition-colors hover:text-zinc-300">
              codaryn
            </Link>
            <span>/</span>
            <span className="text-zinc-300">Analysis Studio</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Analysis Studio
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {workspaces.length > 0 && (
            <div className="w-64 sm:w-72">
              <DropdownSelect
                value={workspaceId}
                options={workspaceOptions}
                onChange={setWorkspaceId}
                placeholder="Select a workspace…"
                searchable
              />
            </div>
          )}

          <CandyButton
            type="button"
            variant={showConsole ? "pearl" : "secondary"}
            size="sm"
            onClick={() => setShowConsole(!showConsole)}
          >
            {showConsole ? "Hide AI Assistant" : "✦ AI Assistant"}
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

      {showConsole && <AIQueryConsole />}

      {workspaces.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#232734] bg-[#14161f] p-12 text-center">
          <h2 className="text-lg font-semibold text-white">
            No active workspaces
          </h2>
          <p className="max-w-md text-xs text-zinc-400">
            Create a workspace in settings to configure repository analysis
            pipelines.
          </p>
          <CandyButton as="a" href="/workspace" variant="pearl" size="sm">
            Create workspace
          </CandyButton>
        </div>
      )}

      {workspace && <Studio key={workspace.id} workspace={workspace} />}
    </main>
  );
}
