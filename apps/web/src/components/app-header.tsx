"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WorkspaceSelectionProvider } from "./workspace-selection";
import { dashboardSections } from "./dashboard-sections";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeSection = dashboardSections.find(({ href }) => pathname === href);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[12rem_minmax(0,1fr)]">
      <a
        href="#dashboard-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <aside className="border-border bg-card sticky top-0 z-30 flex flex-col border-b border-dotted lg:h-dvh lg:border-r lg:border-b-0">
        <div className="lg:border-border flex min-h-14 items-center justify-between gap-3 px-4 lg:border-b lg:border-dotted">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-sm font-semibold tracking-tight"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-5"
            >
              <path d="m12 2 9 5v10l-9 5-9-5V7z M3 7l9 5 9-5 M12 12v10 M7.5 4.5l9 5" />
            </svg>
            Codaryn
          </Link>
          <Link
            href="/workspace"
            className="text-muted text-xs underline-offset-4 hover:underline lg:hidden"
          >
            Workspace
          </Link>
        </div>
        <nav
          aria-label="Primary navigation"
          className="grid grid-cols-4 gap-1 px-2 pb-2 sm:flex sm:flex-wrap sm:px-3 lg:flex-col lg:flex-nowrap lg:overflow-y-auto lg:py-4"
        >
          {dashboardSections.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "text-muted motion-safe:ease-control hover:bg-card-hover hover:text-foreground flex min-w-0 items-center gap-1 rounded-md border border-dotted border-transparent px-1 py-1.5 text-xs focus-visible:outline-2 focus-visible:-outline-offset-2 active:bg-neutral-200 motion-safe:transition-colors motion-safe:duration-150 max-sm:flex-col sm:gap-2.5 sm:px-2.5 sm:py-2 sm:text-sm lg:shrink-0",
                pathname === href &&
                  "border-border text-foreground bg-neutral-100 font-semibold",
              )}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4 shrink-0"
              >
                <path d={icon} />
              </svg>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          ))}
        </nav>
        <nav
          aria-label="Workspace links"
          className="border-border mt-auto hidden space-y-1 border-t border-dotted p-3 lg:block"
        >
          <Link
            href="/workspace"
            className="text-muted hover:bg-card-hover hover:text-foreground block rounded-md px-2.5 py-2 text-sm"
          >
            Workspace settings
          </Link>
          <Link
            href="/team"
            className="text-muted hover:bg-card-hover hover:text-foreground block rounded-md px-2.5 py-2 text-sm"
          >
            Team
          </Link>
          <Link
            href="/docs"
            className="text-muted hover:bg-card-hover hover:text-foreground block rounded-md px-2.5 py-2 text-sm"
          >
            Guide
          </Link>
        </nav>
      </aside>
      <div className="min-w-0">
        <div className="border-border bg-card text-muted hidden min-h-14 items-center justify-between border-b border-dotted px-8 text-xs lg:flex">
          <p>
            Workspace{" "}
            <span aria-hidden="true" className="mx-2 text-neutral-400">
              /
            </span>{" "}
            <span className="text-foreground font-medium">
              {activeSection?.label ?? "Tools"}
            </span>
          </p>
          <Link href="/docs" className="underline-offset-4 hover:underline">
            Help &amp; guide
          </Link>
        </div>
        <div id="dashboard-content" tabIndex={-1}>
          <WorkspaceSelectionProvider>{children}</WorkspaceSelectionProvider>
        </div>
      </div>
    </div>
  );
}
