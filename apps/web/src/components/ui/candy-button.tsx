"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type CandyButtonVariant =
  | "pearl"
  | "obsidian"
  | "secondary"
  | "azure"
  | "emerald"
  | "violet"
  | "amber"
  | "ruby"
  | "outline"
  | "ghost";

export type CandyButtonSize = "xs" | "sm" | "default" | "lg" | "icon";

export interface CandyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: React.ElementType;
  href?: string;
  target?: string;
  rel?: string;
  variant?: CandyButtonVariant;
  size?: CandyButtonSize;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<CandyButtonVariant, string> = {
  pearl:
    "bg-zinc-100 text-zinc-950 border border-zinc-300 shadow-[0_2px_0_0_#a1a1aa] hover:bg-white active:translate-y-[1px] active:shadow-none focus-visible:ring-zinc-400",
  obsidian:
    "bg-[#14151a] text-zinc-100 border border-dotted border-zinc-700 shadow-[0_2px_0_0_#090a0d] hover:bg-[#1a1b22] active:translate-y-[1px] active:shadow-none focus-visible:ring-zinc-500",
  secondary:
    "bg-[#1e1f26] text-zinc-200 border border-dotted border-zinc-700 shadow-[0_2px_0_0_#111216] hover:bg-[#262832] active:translate-y-[1px] active:shadow-none focus-visible:ring-zinc-500",
  azure:
    "bg-[#3f3f46] text-white border border-[#52525b] shadow-[0_2px_0_0_#27272a] hover:bg-[#52525b] active:translate-y-[1px] active:shadow-none focus-visible:ring-zinc-400",
  emerald:
    "bg-[#059669] text-white border border-[#047857] shadow-[0_2px_0_0_#065f46] hover:bg-[#047857] active:translate-y-[1px] active:shadow-none focus-visible:ring-emerald-400",
  violet:
    "bg-[#7c3aed] text-white border border-[#6d28d9] shadow-[0_2px_0_0_#5b21b6] hover:bg-[#6d28d9] active:translate-y-[1px] active:shadow-none focus-visible:ring-violet-400",
  amber:
    "bg-[#d97706] text-white border border-[#b45309] shadow-[0_2px_0_0_#92400e] hover:bg-[#b45309] active:translate-y-[1px] active:shadow-none focus-visible:ring-amber-400",
  ruby: "bg-[#dc2626] text-white border border-[#b91c1c] shadow-[0_2px_0_0_#991b1b] hover:bg-[#b91c1c] active:translate-y-[1px] active:shadow-none focus-visible:ring-red-400",
  outline:
    "bg-transparent text-zinc-200 border border-dotted border-zinc-700 shadow-[0_1px_0_0_#14151a] hover:bg-[#181920] hover:border-zinc-500 active:translate-y-[1px] active:shadow-none focus-visible:ring-zinc-500",
  ghost:
    "bg-transparent text-zinc-300 border border-transparent hover:bg-[#181920] hover:text-white active:bg-[#20212b] focus-visible:ring-zinc-500",
};

const sizeStyles: Record<CandyButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs rounded-md gap-1.5 [&_svg]:size-3.5",
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5 [&_svg]:size-3.5 font-medium",
  default: "h-9 px-4 text-sm rounded-lg gap-2 [&_svg]:size-4 font-medium",
  lg: "h-11 px-5 text-base rounded-xl gap-2.5 [&_svg]:size-5 font-medium",
  icon: "size-9 p-0 rounded-lg gap-0 [&_svg]:size-4",
};

export const CandyButton = React.forwardRef<HTMLElement, CandyButtonProps>(
  (
    {
      as,
      className,
      children,
      variant = "obsidian",
      size = "default",
      leftIcon,
      rightIcon,
      style,
      disabled,
      ...props
    },
    ref,
  ) => {
    const commonClass = cn(
      "relative inline-flex items-center justify-center tracking-tight select-none cursor-pointer transition-all duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090a0d] disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed",
      variantStyles[variant],
      sizeStyles[size],
      className,
    );

    const innerContent = (
      <>
        {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        <span className="truncate">{children}</span>
        {rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </>
    );

    if (as === "a" || props.href) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={props.href}
          target={props.target}
          rel={props.rel}
          style={style}
          className={commonClass}
          aria-disabled={disabled}
          role="button"
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
        >
          {innerContent}
        </a>
      );
    }

    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        disabled={disabled}
        style={style}
        className={commonClass}
        {...props}
      >
        {innerContent}
      </button>
    );
  },
);

CandyButton.displayName = "CandyButton";

export default CandyButton;
