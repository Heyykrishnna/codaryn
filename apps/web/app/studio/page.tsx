"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { workspaceListSchema, type WorkspaceSummary } from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { Studio } from "@/src/features/analysis-studio/studio";
import { control } from "@/src/features/repositories/api";
export default function StudioPage() {
  const { data: session, isPending, error } = authClient.useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [message, setMessage] = useState("");
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
  if (isPending)
    return <output className="block p-8">Loading Analysis Studio…</output>;
  if (error)
    return (
      <p role="alert" className="p-8">
        Unable to verify your session. Reload to retry.
      </p>
    );
  if (!session)
    return (
      <main className="p-8">
        <Link
          href="/workspace"
          className="text-indigo-600 underline dark:text-indigo-400"
        >
          Sign in to use Analysis Studio
        </Link>
      </main>
    );
  const workspace = workspaces.find((item) => item.id === workspaceId);
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap justify-between gap-4">
        <Link href="/">codaryn</Link>
        <Link href="/repositories">Repositories</Link>
        <Link href="/analysis">Analysis</Link>
        <Link href="/graph">Graph</Link>
        <Link href="/workspace">Workspace settings</Link>
      </header>
      <h1 className="text-3xl font-semibold">Analysis Studio</h1>
      <p role="alert">{message}</p>
      {workspaces.length === 0 && (
        <p>
          Create a workspace in{" "}
          <Link href="/workspace" className="underline">
            workspace settings
          </Link>{" "}
          to begin.
        </p>
      )}
      <label className="flex flex-col gap-2">
        <span>Workspace</span>
        <select
          className={control}
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
        >
          {workspaces.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {workspace && <Studio key={workspace.id} workspace={workspace} />}
    </main>
  );
}
