"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { workspaceListSchema, type WorkspaceSummary } from "@codaryn/contracts";
import { authClient } from "@/src/lib/auth-client";
import { control } from "@/src/features/repositories/api";
export function WorkspaceExplorer({
  title,
  children,
}: Readonly<{ title: string; children: (workspaceId: string) => ReactNode }>) {
  const { data: session, isPending, error } = authClient.useSession();
  const [data, setData] = useState<{
      items: WorkspaceSummary[];
      active: string;
    } | null>(null),
    [selected, setSelected] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!session) return;
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
          active: result.active ?? result.workspaces[0]?.id ?? "",
        });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage("Unable to load workspaces. Reload to retry.");
      });
    return () => controller.abort();
  }, [session]);
  if (isPending) return <output className="block p-8">Loading {title}…</output>;
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
          Sign in to use {title}
        </Link>
      </main>
    );
  const workspace = selected || data?.active || "";
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap justify-between gap-4">
        <Link href="/">codaryn</Link>
        <Link href="/studio">Analysis Studio</Link>
        <Link href="/schema">Schema Studio</Link>
        <Link href="/execution">Execution Explorer</Link>
        <Link href="/quality">Engineering Quality</Link>
        <Link href="/comparisons">Architecture Comparison</Link>
        <Link href="/team">Organization dashboard</Link>
        <Link href="/workspace">Workspace settings</Link>
      </header>
      <h1 className="text-3xl font-semibold">{title}</h1>
      {message && <p role="alert">{message}</p>}
      {!data && !message && <output>Loading workspaces…</output>}
      {data && (
        <label className="flex flex-col gap-2">
          <span>Workspace</span>
          <select
            className={control}
            value={workspace}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Select a workspace</option>
            {data.items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {data && !data.items.length && (
        <p>Create a workspace to explore repository analysis.</p>
      )}
      {workspace && children(workspace)}
    </main>
  );
}
