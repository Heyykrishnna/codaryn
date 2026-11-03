import { healthResponseSchema } from "@codaryn/contracts";

export default async function Home() {
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
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <span className="text-xl font-semibold tracking-tight">codaryn</span>
        <nav aria-label="Main navigation">
          <a
            className="rounded text-sm text-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-4 dark:text-zinc-300"
            href="#overview"
          >
            Overview
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
        <div
          role="status"
          className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800"
        >
          {available
            ? "API connected"
            : "API unavailable. Start the API to connect."}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Repository analysis and workspace features are under development.
        </p>
      </section>
    </main>
  );
}
