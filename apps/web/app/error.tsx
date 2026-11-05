"use client";
import Link from "next/link";
import { useEffect } from "react";
import { reportMeasurement } from "@/src/lib/measurements";
export default function PageError({
  retry,
}: Readonly<{ error: unknown; retry: () => void }>) {
  useEffect(() => {
    void reportMeasurement("client-error", 1);
  }, []);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">This view could not load</h1>
      <p>
        Your data remains on the server. Retry this view or return to your
        workspace.
      </p>
      <button
        className="rounded-lg border border-zinc-400 px-4 py-2 focus-visible:outline-2 focus-visible:outline-indigo-500"
        onClick={retry}
      >
        Try again
      </button>
      <Link
        className="text-indigo-600 underline dark:text-indigo-400"
        href="/workspace"
      >
        Workspace settings
      </Link>
    </main>
  );
}
