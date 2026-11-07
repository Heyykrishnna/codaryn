"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface DropdownSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}

export interface DropdownSelectProps {
  value: string;
  options: DropdownSelectOption[];
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
}

export function DropdownSelect({
  value,
  options,
  onChange,
  label,
  placeholder = "Select an option…",
  disabled = false,
  className,
  searchable = false,
}: DropdownSelectProps) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const id = useId();
  const open = expanded && !disabled;
  const selected = options.find((option) => option.value === value);
  const needle = query.trim().toLowerCase();
  const filtered = searchable
    ? options.filter((option) =>
        `${option.label} ${option.description ?? ""}`
          .toLowerCase()
          .includes(needle),
      )
    : options;

  useEffect(() => {
    if (!open) return;
    function dismiss(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !root.current?.contains(event.target)
      ) {
        setExpanded(false);
      }
    }

    const panel = root.current?.querySelector("[data-dropdown-panel]");
    const initial =
      panel?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ??
      panel?.querySelector<HTMLButtonElement>("[data-dropdown-option]");
    (search.current ?? initial)?.focus();
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  function show() {
    setQuery("");
    setExpanded(true);
  }

  function close() {
    setExpanded(false);
    trigger.current?.focus();
  }

  function handleKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    if (!open) {
      if (!disabled && event.key.startsWith("Arrow")) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.target === search.current && !event.key.startsWith("Arrow"))
      return;
    const choices = Array.from(
      root.current?.querySelectorAll<HTMLButtonElement>(
        "[data-dropdown-option]",
      ) ?? [],
    );
    if (!choices.length) return;
    event.preventDefault();
    const index = choices.findIndex(
      (option) => option === document.activeElement,
    );
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? choices.length - 1
          : event.key === "ArrowDown"
            ? (index + 1) % choices.length
            : index <= 0
              ? choices.length - 1
              : index - 1;
    choices[next]?.focus();
  }

  return (
    <div
      ref={root}
      className={cn("relative min-w-0", className)}
      onKeyDown={handleKeys}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setExpanded(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-label={
          label ? `${label}: ${selected?.label ?? placeholder}` : undefined
        }
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : show())}
        className="border-border bg-card text-foreground motion-safe:ease-control hover:bg-card-hover flex min-h-9 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-dotted px-3 py-1.5 text-left text-sm hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-150"
      >
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon && (
            <span className="shrink-0" aria-hidden="true">
              {selected.icon}
            </span>
          )}
          <span className="truncate">{selected?.label ?? placeholder}</span>
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(
            "text-muted size-4 shrink-0 motion-safe:transition-transform",
            open && "rotate-180",
          )}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          id={id}
          data-dropdown-panel
          role="group"
          aria-label={label ?? placeholder}
          className="border-border bg-card motion-safe:animate-menu-in absolute inset-x-0 top-full z-20 mt-1.5 rounded-lg border border-dotted p-1.5 shadow-md"
        >
          {searchable && (
            <input
              ref={search}
              type="search"
              aria-label={
                label
                  ? `Search ${label.toLowerCase()} options`
                  : "Search options"
              }
              placeholder="Search options…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="border-border bg-background placeholder:text-muted mb-1 w-full min-w-0 rounded-md border border-dotted px-2.5 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-1"
            />
          )}
          <div className="max-h-52 space-y-0.5 overflow-y-auto overscroll-contain">
            {filtered.length === 0 && (
              <p role="status" className="text-muted px-2.5 py-2 text-sm">
                No matching options
              </p>
            )}
            {filtered.map((option) => (
              <button
                key={option.value}
                type="button"
                data-dropdown-option
                aria-pressed={option.value === value}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className="text-foreground hover:bg-card-hover focus-visible:bg-card-hover flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm focus-visible:outline-2 focus-visible:-outline-offset-2 aria-pressed:bg-neutral-100 motion-safe:transition-colors"
              >
                {option.icon && (
                  <span className="shrink-0" aria-hidden="true">
                    {option.icon}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{option.label}</span>
                  {option.description && (
                    <span className="text-muted block truncate text-xs">
                      {option.description}
                    </span>
                  )}
                </span>
                {option.value === value && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
