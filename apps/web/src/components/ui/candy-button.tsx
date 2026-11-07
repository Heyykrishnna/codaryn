"use client";

import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type CandyButtonVariant =
  "pearl" | "obsidian" | "secondary" | "ruby" | "outline" | "ghost";

export type CandyButtonSize = "xs" | "sm" | "default" | "lg" | "icon";

type Appearance = {
  variant?: CandyButtonVariant;
  size?: CandyButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style"> & {
  as?: never;
};

type LinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "style" | "href"
> & {
  as: "a";
  href: string;
  disabled?: boolean;
};

export type CandyButtonProps = Appearance & (ButtonProps | LinkProps);

const solid =
  "border border-dotted border-neutral-700 bg-neutral-900 text-white shadow-[0_2px_0_#525252] hover:bg-neutral-800";
const subtle =
  "border border-dotted border-border bg-white text-foreground shadow-[0_2px_0_#e5e5e5] hover:bg-card-hover";

const variantStyles: Record<CandyButtonVariant, string> = {
  pearl: solid,
  obsidian: subtle,
  secondary: subtle,
  ruby: solid,
  outline:
    "border border-dotted border-border text-foreground hover:bg-card-hover",
  ghost:
    "border border-transparent text-muted hover:bg-card-hover hover:text-foreground",
};

const sizeStyles: Record<CandyButtonSize, string> = {
  xs: "h-7 px-2.5 text-xs rounded-md gap-1.5 [&_svg]:size-3.5",
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5 [&_svg]:size-3.5 font-medium",
  default: "h-9 px-4 text-sm rounded-lg gap-2 [&_svg]:size-4 font-medium",
  lg: "h-11 px-5 text-base rounded-xl gap-2.5 [&_svg]:size-5 font-medium",
  icon: "size-9 p-0 rounded-lg gap-0 [&_svg]:size-4",
};

export function CandyButton({
  variant = "obsidian",
  size = "default",
  leftIcon,
  rightIcon,
  className,
  children,
  ...props
}: CandyButtonProps) {
  const classes = cn(
    "relative inline-flex min-w-0 items-center justify-center tracking-tight select-none cursor-pointer motion-safe:transition-[background-color,border-color,color,translate,box-shadow] motion-safe:duration-150 motion-safe:ease-control motion-safe:active:translate-y-px active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );
  const content = (
    <>
      {leftIcon && (
        <span className="shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      )}
      <span className="truncate">{children}</span>
      {rightIcon && (
        <span className="shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </>
  );

  if (props.as === "a") {
    const { as: Element, href, disabled, ...link } = props;
    if (disabled) {
      return (
        <Element className={classes} aria-disabled="true">
          {content}
        </Element>
      );
    }
    return (
      <Link {...link} href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button {...props} type={props.type ?? "button"} className={classes}>
      {content}
    </button>
  );
}

export default CandyButton;
