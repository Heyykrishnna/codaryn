import { healthResponseSchema } from "@codaryn/contracts";
import { Suspense } from "react";

async function ApiStatus() {
  let available = false;
  try {
    const response = await fetch(
      `${process.env.API_URL ?? "http://127.0.0.1:4000"}/api/v1/health`,
      { cache: "no-store", signal: AbortSignal.timeout(2000) },
    );
    available =
      response.ok &&
      healthResponseSchema.safeParse(await response.json()).success;
  } catch {
    available = false;
  }
  return (
    <output className="block rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
      {available
        ? "API connected"
        : "API unavailable. Start the API to connect."}
    </output>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <span className="text-xl font-semibold tracking-tight">codaryn</span>
        <nav aria-label="Main navigation" className="flex gap-4">
          <a
            href="/execution"
            className="text-sm text-indigo-600 underline dark:text-indigo-400"
          >
            Execution Explorer
          </a>
          <a
            href="/schema"
            className="text-sm text-indigo-600 underline dark:text-indigo-400"
          >
            Schema Studio
          </a>
          <a
            className="rounded text-sm text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-4 dark:text-zinc-300"
            href="/workspace"
          >
            Workspace
          </a>
        </nav>
      </header>
      <section id="overview" className="flex max-w-2xl flex-col gap-5">
        <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          Architecture workspace
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Every connection, in view.
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-300">
          An evidence-backed architecture map of your codebase.
        </p>
        <Suspense
          fallback={
            <output className="block rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
              Checking API connection…
            </output>
          }
        >
          <ApiStatus />
        </Suspense>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Configure repository analysis through the Analysis Studio.
        </p>
      </section>
      <a
        className="self-start rounded-md bg-indigo-600 px-4 py-2 font-medium text-white focus-visible:outline-2 focus-visible:outline-indigo-500"
        href="/studio"
      >
        Open Analysis Studio
      </a>
    </main>
  );
}
