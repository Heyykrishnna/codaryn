"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CandyButton } from "@/src/components/ui/candy-button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/studio", label: "Studio" },
  { href: "/quality", label: "Quality" },
  { href: "/execution", label: "Execution" },
  { href: "/schema", label: "Schema" },
  { href: "/graph", label: "Graph" },
  { href: "/comparisons", label: "Comparisons" },
  { href: "/repositories", label: "Repositories" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#20232e] bg-[#0d0e12]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-base font-bold tracking-tight text-white transition-opacity hover:opacity-90"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#2d3240] bg-[#161821] font-mono text-xs font-semibold text-blue-400">
              CD
            </span>
            <span>codaryn</span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {navItems.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors select-none",
                    active
                      ? "border border-[#2f3546] bg-[#1f232f] text-white"
                      : "text-zinc-400 hover:bg-[#161820] hover:text-zinc-200",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-[#242733] bg-[#12141a] px-2.5 py-1 font-mono text-[11px] text-zinc-400 sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>Architecture Live</span>
          </div>

          <Link
            href="/docs"
            className="hidden text-xs text-zinc-400 transition-colors hover:text-zinc-200 lg:block"
          >
            Docs
          </Link>

          <CandyButton
            as="a"
            href="/workspace"
            variant="obsidian"
            size="sm"
            leftIcon={
              <svg
                className="h-3.5 w-3.5 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            }
          >
            Workspace
          </CandyButton>
        </div>
      </div>
    </header>
  );
}

export default AppHeader;
