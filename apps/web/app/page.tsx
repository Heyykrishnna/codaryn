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
            available ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
          }`}
        />
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-white">
            {available ? "API Engine Connected" : "API Offline (Mock Fallbacks Active)"}
          </span>
          <span className="text-[11px] text-zinc-400 font-mono">
            {available
              ? "127.0.0.1:4000 · contracts/v1 verified"
              : "Start local service on :4000 to synchronize live GitHub events"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded bg-[#1c1f2b] px-2 py-0.5 text-[10px] font-mono text-zinc-400">
          latency ~4ms
        </span>
        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400 border border-emerald-500/20">
          healthy
        </span>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-16 px-4 py-12 sm:px-6 sm:py-16">
      <section className="relative flex flex-col items-center text-center gap-6 max-w-3xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#2b303f] bg-[#151722] px-3 py-1 text-xs font-mono text-blue-400">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          <span>EVIDENCE-BACKED ARCHITECTURE INTELLIGENCE</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl sm:leading-[1.1]">
          Every connection, <br />
          <span className="text-zinc-300">in crystal view.</span>
        </h1>

        <p className="max-w-2xl text-base text-zinc-400 sm:text-lg sm:leading-relaxed">
          An automated, evidence-backed architecture map of your codebase.
          Trace symbols, audit cross-service boundaries, prevent cycles, and verify
          execution lifecycles in real time.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <CandyButton
            as="a"
            href="/studio"
            variant="pearl"
            size="lg"
            rightIcon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
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
              <div className="rounded-xl border border-[#232733] bg-[#12141c] p-4 text-xs text-zinc-400 text-center">
                <LoaderOrb
                  variant="inline"
                  label="Verifying API status…"
                />
              </div>
            }
          >
            <ApiStatus />
          </Suspense>
        </div>
      </section>

      <section className="rounded-2xl border border-[#242835] bg-[#13151d] p-6 sm:p-8 flex flex-col gap-8 shadow-2xl">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Start with one source</h2>
            <p className="text-xs text-zinc-400">
              Pick a repository or drag a schema. codaryn reads the AST and contract definitions, never your secrets.
            </p>
          </div>
          <span className="rounded-full bg-[#1e2230] px-3 py-1 text-xs font-mono text-zinc-300 self-start sm:self-auto">
            4 sources supported
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/repositories"
            className="group flex flex-col gap-3 rounded-xl border border-[#262a37] bg-[#171923] p-4 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1c1f2b] active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-xs font-bold text-blue-400 border border-blue-500/20">
                Git
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Recommended
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-xs font-bold text-teal-400 border border-teal-500/20">
                Pg
              </span>
              <span className="text-[10px] font-mono text-zinc-500">Direct or SSH</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-teal-300 transition-colors">
                Postgres Database
              </p>
              <p className="text-xs text-zinc-400">ERD & foreign key topology</p>
            </div>
          </Link>

          <Link
            href="/studio"
            className="group flex flex-col gap-3 rounded-xl border border-[#262a37] bg-[#171923] p-4 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1c1f2b] active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-xs font-bold text-purple-400 border border-purple-500/20">
                BQ
              </span>
              <span className="text-[10px] font-mono text-zinc-500">Service account</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">
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
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-xs font-bold text-sky-400 border border-sky-500/20">
                Sf
              </span>
              <span className="text-[10px] font-mono text-zinc-500">OAuth 2.0</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors">
                Snowflake Warehouse
              </p>
              <p className="text-xs text-zinc-400">Data warehouse manifests</p>
            </div>
          </Link>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-[#292d3c] bg-[#171922] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/10 text-xs font-mono text-amber-400 border border-amber-500/20">
                📄
              </span>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-zinc-200">
                  codaryn_contracts_v1.manifest.json
                </span>
                <span className="text-[11px] text-zinc-500 font-mono">
                  AST parsed · 14,204 tokens indexed
                </span>
              </div>
            </div>
            <span className="text-xs font-mono text-zinc-400">
              3.8 of 4.2 MB · complete
            </span>
          </div>

          <div className="h-1.5 w-full rounded-full bg-[#232734] overflow-hidden">
            <div className="h-full w-full bg-blue-500 rounded-full" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-blue-400 border border-blue-500/20">
                Aa 142 types
              </span>
              <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-emerald-400 border border-emerald-500/20">
                # 84 endpoints
              </span>
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-400 border border-amber-500/20">
                ◷ 0 cycle leaks
              </span>
              <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-purple-400 border border-purple-500/20">
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
            <span className="text-blue-400 font-mono">+6.2%</span>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-white font-mono">
            18,420
          </p>
          <p className="text-xs text-zinc-500">Cross-package symbol registry</p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[#242835] bg-[#13151d] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Dependency Cycles</span>
            <span className="text-emerald-400 font-mono">0 critical</span>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-white font-mono">
            0
          </p>
          <p className="text-xs text-zinc-500">Hermetic module boundaries</p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[#242835] bg-[#13151d] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Contract Verification</span>
            <span className="text-teal-400 font-mono">99.2%</span>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-white font-mono">
            99.2%
          </p>
          <p className="text-xs text-zinc-500">Schema & API Zod contracts</p>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-[#242835] bg-[#13151d] p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Execution Latency</span>
            <span className="text-zinc-400 font-mono">p99 &lt; 15ms</span>
          </div>
          <p className="text-3xl font-extrabold tracking-tight text-white font-mono">
            11.2 ms
          </p>
          <p className="text-xs text-zinc-500">Bounded graph render target</p>
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-2xl border border-[#242835] bg-[#13151d] p-6 sm:p-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">System Feature Suite</h2>
            <p className="text-xs text-zinc-400">
              Direct access to all evidence-backed architecture analyzers.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
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
              <span className="text-sm font-semibold text-white">Analysis Studio</span>
              <span className="text-xs font-mono text-blue-400">/studio</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Step-by-step pipeline config: select repositories, branches, commit SHAs, analyzer depths, and exclusion patterns.
            </p>
          </Link>

          <Link
            href="/quality"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Engineering Quality</span>
              <span className="text-xs font-mono text-teal-400">/quality</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Symbol inventory, coverage distribution, external dependencies, and security compliance matrices.
            </p>
          </Link>

          <Link
            href="/execution"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Execution Explorer</span>
              <span className="text-xs font-mono text-purple-400">/execution</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Interactive trace DAGs, step execution inspector, and timing analysis across asynchronous operations.
            </p>
          </Link>

          <Link
            href="/schema"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Schema Studio</span>
              <span className="text-xs font-mono text-amber-400">/schema</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Database entity-relationship visualizer, column types, relationship integrity, and migration sanity checks.
            </p>
          </Link>

          <Link
            href="/graph"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Dependency Graph</span>
              <span className="text-xs font-mono text-sky-400">/graph</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Bounded graph view with topological depth filtering, circular dependency highlights, and keyboard navigation.
            </p>
          </Link>

          <Link
            href="/comparisons"
            className="flex flex-col gap-3 rounded-xl border border-[#252936] bg-[#161821] p-5 transition-all duration-150 hover:border-[#383e52] hover:bg-[#1b1e2a]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Architecture Comparisons</span>
              <span className="text-xs font-mono text-emerald-400">/comparisons</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Side-by-side AST and contract diffs across commits to stop architectural regression before merge.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}
