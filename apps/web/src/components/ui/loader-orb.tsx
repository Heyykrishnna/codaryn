"use client";

import React from "react";
import { Orb } from "@/src/components/ui/orb";
import { cn } from "@/lib/utils";

export interface LoaderOrbProps {
  label?: string;
  description?: string;
  variant?: "fullscreen" | "card" | "inline";
  size?: 64 | 20;
  className?: string;
}

export function LoaderOrb({
  label = "Connecting to workspace…",
  description = "Verifying architectural manifests and symbols",
  variant = "card",
  size = 64,
  className,
}: LoaderOrbProps) {
  if (variant === "inline") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("inline-flex items-center gap-2 select-none", className)}
      >
        <Orb state="connecting" size={20} display={20} interactive={false} />
        {label && (
          <span className="text-xs font-medium text-zinc-300">{label}</span>
        )}
      </div>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#090a0d]/85 p-4 backdrop-blur-md duration-200",
          className,
        )}
      >
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-dotted border-zinc-700/80 bg-[#121318] p-8 text-center shadow-2xl">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-4 rounded-full bg-zinc-800 opacity-40 blur-lg" />
            <Orb
              state="connecting"
              size={size}
              display={size}
              interactive={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
              <p className="text-sm font-semibold tracking-tight text-white">
                {label}
              </p>
            </div>
            {description && (
              <p className="max-w-xs text-xs leading-relaxed text-zinc-400">
                {description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-dotted border-zinc-700/80 bg-[#111216]/95 p-10 text-center shadow-lg backdrop-blur-md",
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-3 rounded-full bg-zinc-800 opacity-30 blur-md" />
        <Orb
          state="connecting"
          size={size}
          display={size}
          interactive={false}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-zinc-400" />
          <p className="text-sm font-medium text-zinc-200">{label}</p>
        </div>
        {description && (
          <p className="max-w-sm text-xs leading-relaxed text-zinc-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function SectionLoader({
  label = "Fetching data…",
  description,
  className,
}: {
  label?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[200px] w-full items-center justify-center p-6",
        className,
      )}
    >
      <LoaderOrb label={label} description={description} variant="card" />
    </div>
  );
}

export default LoaderOrb;
