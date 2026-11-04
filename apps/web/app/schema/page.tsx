"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { workspaceListSchema, type WorkspaceSummary } from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { SchemaStudio } from "@/src/features/schema-studio/studio";
import { control } from "@/src/features/repositories/api";
export default function SchemaPage() {
  const { data: session, isPending, error } = authClient.useSession();
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!session) return;
    let active = true;
    fetch("/api/v1/workspace/list", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Workspace access unavailable");
        const result = workspaceListSchema.parse(await response.json());
        if (active) {
          setWorkspaces(result.workspaces);
          setWorkspaceId(result.active ?? result.workspaces[0]?.id ?? "");
        }
      })
      .catch(() => {
        if (active) setMessage("Unable to load workspaces. Reload to retry.");
      });
    return () => {
      active = false;
    };
  }, [session]);
  if (isPending)
    return <output className="block p-8">Loading Schema Studio…</output>;
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
          Sign in to use Schema Studio
        </Link>
      </main>
    );
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap justify-between gap-4">
        <Link href="/">codaryn</Link>
        <Link href="/studio">Analysis Studio</Link>
        <Link href="/backend">Backend Explorer</Link>
        <Link href="/workspace">Workspace settings</Link>
      </header>
      <h1 className="text-3xl font-semibold">Schema Studio</h1>
      <p role="alert">{message}</p>
      <label className="flex flex-col gap-2">
        <span>Workspace</span>
        <select
          className={control}
          value={workspaceId}
          onChange={(event) => setWorkspaceId(event.target.value)}
        >
          <option value="">Select a workspace</option>
          {workspaces.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {!workspaces.length && (
        <p>Create a workspace to inspect repository schemas.</p>
      )}
      {workspaceId && (
        <SchemaStudio key={workspaceId} workspaceId={workspaceId} />
      )}
    </main>
  );
}
