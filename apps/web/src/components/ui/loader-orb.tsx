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
          "animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#0d0e12]/85 p-4 backdrop-blur-md duration-200",
          className,
        )}
      >
        <div className="flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-[#232734] bg-[#14161e] p-8 text-center shadow-2xl">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-4 rounded-full bg-[#1e2230] opacity-50 blur-lg" />
            <Orb
              state="connecting"
              size={size}
              display={size}
              interactive={false}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
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
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#232734] bg-[#13151b]/90 p-10 text-center shadow-lg backdrop-blur-md",
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-3 rounded-full bg-[#1b1f2b] opacity-40 blur-md" />
        <Orb
          state="connecting"
          size={size}
          display={size}
          interactive={false}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
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

export default LoaderOrb;
