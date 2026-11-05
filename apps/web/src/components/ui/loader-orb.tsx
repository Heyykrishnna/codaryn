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
        {label && <span className="text-xs text-zinc-300 font-medium">{label}</span>}
      </div>
    );
  }

  if (variant === "fullscreen") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-[#0d0e12]/85 animate-in fade-in duration-200",
          className,
        )}
      >
        <div className="flex flex-col items-center gap-4 max-w-sm rounded-2xl border border-[#232734] bg-[#14161e] p-8 text-center shadow-2xl">
          <div className="relative flex items-center justify-center">
            <div className="absolute -inset-4 rounded-full bg-[#1e2230] opacity-50 blur-lg" />
            <Orb state="connecting" size={size} display={size} interactive={false} />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-semibold tracking-tight text-white">{label}</p>
            </div>
            {description && (
              <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">{description}</p>
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
        "relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#232734] bg-[#13151b]/90 p-10 text-center backdrop-blur-md shadow-lg",
        className,
      )}
    >
      <div className="relative flex items-center justify-center">
        <div className="absolute -inset-3 rounded-full bg-[#1b1f2b] opacity-40 blur-md" />
        <Orb state="connecting" size={size} display={size} interactive={false} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-sm font-medium text-zinc-200">{label}</p>
        </div>
        {description && (
          <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

export default LoaderOrb;
