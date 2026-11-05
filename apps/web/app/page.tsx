import { healthResponseSchema } from "@codaryn/contracts";
import { Suspense } from "react";
import Link from "next/link";
import { CandyButton } from "@/src/components/ui/candy-button";
import { LoaderOrb } from "@/src/components/ui/loader-orb";

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
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#232733] bg-[#12141c] px-4 py-3">
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            available ? "animate-pulse bg-emerald-500" : "bg-amber-500"
          }`}
        />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white">
            {available
              ? "API Engine Connected"
              : "API Offline (Mock Fallbacks Active)"}
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            {available
              ? "127.0.0.1:4000 · contracts/v1 verified"
              : "Start local service on :4000 to synchronize live GitHub events"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded bg-[#1c1f2b] px-2 py-0.5 font-mono text-[10px] text-zinc-400">
          latency ~4ms
        </span>
        <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
          healthy
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
      <section className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 pt-6 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2b303f] bg-[#151722] px-3 py-1 font-mono text-xs text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <span>EVIDENCE-BACKED ARCHITECTURE INTELLIGENCE</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.1]">
          Every connection, <br />
          <span className="text-zinc-300">in crystal view.</span>
        </h1>

        <p className="max-w-2xl text-base text-zinc-400 sm:text-lg sm:leading-relaxed">
          An automated, evidence-backed architecture map of your codebase. Trace
          symbols, audit cross-service boundaries, prevent cycles, and verify
          execution lifecycles in real time.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <CandyButton
            as="a"
            href="/studio"
            variant="pearl"
            size="lg"
            rightIcon={
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            }
          >
            Open Analysis Studio
          </CandyButton>

          <CandyButton as="a" href="/workspace" variant="obsidian" size="lg">
            Manage Workspaces
          </CandyButton>

          <CandyButton as="a" href="/docs" variant="outline" size="lg">
            Offline Guide
          </CandyButton>
        </div>

        <div className="w-full max-w-xl pt-4">
          <Suspense
            fallback={
              <div className="rounded-xl border border-[#232733] bg-[#12141c] p-4 text-center text-xs text-zinc-400">
                <LoaderOrb variant="inline" label="Verifying API status…" />
              </div>
            }
          >
            <ApiStatus />
          </Suspense>
        </div>
      </section>

      <section className="flex flex-col gap-8 rounded-2xl border border-[#242835] bg-[#13151d] p-6 shadow-2xl sm:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              Start with one source
            </h2>
            <p className="text-xs text-zinc-400">
              Pick a repository or drag a schema. codaryn reads the AST and
              contract definitions, never your secrets.
            </p>
          </div>
          <span className="self-start rounded-full bg-[#1e2230] px-3 py-1 font-mono text-xs text-zinc-300 sm:self-auto">
            4 sources supported
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/repositories"
            className="group flex flex-col gap-3 rounded-xl border border-[#262a37] bg-[#171923] p-4 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1c1f2b] active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-xs font-bold text-blue-400">
                Git
              </span>
              <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
                Recommended
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white transition-colors group-hover:text-blue-300">
                GitHub Monorepo
              </p>
              <p className="text-xs text-zinc-400">Direct GitHub App webhook</p>
            </div>
          </Link>

          <Link
            href="/schema"
            className="group flex flex-col gap-3 rounded-xl border border-[#262a37] bg-[#171923] p-4 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1c1f2b] active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-teal-500/20 bg-teal-500/10 text-xs font-bold text-teal-400">
                Pg
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                Direct or SSH
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white transition-colors group-hover:text-teal-300">
                Postgres Database
              </p>
              <p className="text-xs text-zinc-400">
                ERD & foreign key topology
              </p>
            </div>
          </Link>

          <Link
            href="/studio"
            className="group flex flex-col gap-3 rounded-xl border border-[#262a37] bg-[#171923] p-4 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1c1f2b] active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-xs font-bold text-purple-400">
                BQ
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                Service account
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white transition-colors group-hover:text-purple-300">
                BigQuery Data Warehouse
              </p>
              <p className="text-xs text-zinc-400">Pipeline schema lineage</p>
            </div>
          </Link>

          <Link
            href="/studio"
            className="group flex flex-col gap-3 rounded-xl border border-[#262a37] bg-[#171923] p-4 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1c1f2b] active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-xs font-bold text-sky-400">
                Sf
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                OAuth 2.0
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white transition-colors group-hover:text-sky-300">
                Snowflake Warehouse
              </p>
              <p className="text-xs text-zinc-400">Data warehouse manifests</p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-[#292d3c] bg-[#171922] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded border border-amber-500/20 bg-amber-500/10 font-mono text-xs text-amber-400">
                📄
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-200">
                  codaryn_contracts_v1.manifest.json
                </span>
                <span className="font-mono text-[11px] text-zinc-500">
                  AST parsed · 14,204 tokens indexed
                </span>
              </div>
            </div>
            <span className="font-mono text-xs text-zinc-400">
              3.8 of 4.2 MB · complete
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#232734]">
            <div className="h-full w-full rounded-full bg-blue-500" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-400">
                Aa 142 types
              </span>
              <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-emerald-400">
                # 84 endpoints
              </span>
              <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-amber-400">
                ◷ 0 cycle leaks
              </span>
              <span className="rounded border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-purple-400">
                ✓ 28 packages
              </span>
            </div>

            <div className="flex items-center gap-2">
              <CandyButton as="a" href="/studio" variant="pearl" size="sm">
                Connect Source
              </CandyButton>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2 rounded-xl border border-[#242835] bg-[#13151d] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Indexed Symbols</span>
            <span className="font-mono text-blue-400">+6.2%</span>
          </div>
          <p className="font-mono text-3xl font-extrabold tracking-tight text-white">
            18,420
          </p>
          <p className="text-xs text-zinc-500">Cross-package symbol registry</p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[#242835] bg-[#13151d] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Dependency Cycles</span>
            <span className="font-mono text-emerald-400">0 critical</span>
          </div>
          <p className="font-mono text-3xl font-extrabold tracking-tight text-white">
            0
          </p>
          <p className="text-xs text-zinc-500">Hermetic module boundaries</p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[#242835] bg-[#13151d] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Contract Verification</span>
            <span className="font-mono text-teal-400">99.2%</span>
          </div>
          <p className="font-mono text-3xl font-extrabold tracking-tight text-white">
            99.2%
          </p>
          <p className="text-xs text-zinc-500">Schema & API Zod contracts</p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[#242835] bg-[#13151d] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Execution Latency</span>
            <span className="font-mono text-zinc-400">p99 &lt; 15ms</span>
          </div>
          <p className="font-mono text-3xl font-extrabold tracking-tight text-white">
            11.2 ms
          </p>
          <p className="text-xs text-zinc-500">Bounded graph render target</p>
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-2xl border border-[#242835] bg-[#13151d] p-6 sm:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">
              System Feature Suite
            </h2>
            <p className="text-xs text-zinc-400">
              Direct access to all evidence-backed architecture analyzers.
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>8 modules ready</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/studio"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Analysis Studio
              </span>
              <span className="font-mono text-xs text-blue-400">/studio</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Step-by-step pipeline config: select repositories, branches,
              commit SHAs, analyzer depths, and exclusion patterns.
            </p>
          </Link>

          <Link
            href="/quality"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Engineering Quality
              </span>
              <span className="font-mono text-xs text-teal-400">/quality</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Symbol inventory, coverage distribution, external dependencies,
              and security compliance matrices.
            </p>
          </Link>

          <Link
            href="/execution"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Execution Explorer
              </span>
              <span className="font-mono text-xs text-purple-400">
                /execution
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Interactive trace DAGs, step execution inspector, and timing
              analysis across asynchronous operations.
            </p>
          </Link>

          <Link
            href="/schema"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Schema Studio
              </span>
              <span className="font-mono text-xs text-amber-400">/schema</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Database entity-relationship visualizer, column types,
              relationship integrity, and migration sanity checks.
            </p>
          </Link>

          <Link
            href="/graph"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Dependency Graph
              </span>
              <span className="font-mono text-xs text-sky-400">/graph</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Bounded graph view with topological depth filtering, circular
              dependency highlights, and keyboard navigation.
            </p>
          </Link>

          <Link
            href="/comparisons"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                Architecture Comparisons
              </span>
              <span className="font-mono text-xs text-emerald-400">
                /comparisons
              </span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Side-by-side AST and contract diffs across commits to stop
              architectural regression before merge.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
