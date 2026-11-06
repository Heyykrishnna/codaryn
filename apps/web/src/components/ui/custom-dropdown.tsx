"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  close: () => void;
  triggerId: string;
  menuId: string;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("Dropdown components must be used within a CustomDropdown");
  }
  return context;
}

export interface CustomDropdownProps {
  trigger?: React.ReactNode;
  children: React.ReactNode;
  align?: "left" | "right" | "center";
  width?: "auto" | "trigger" | "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

export function CustomDropdown({
  trigger,
  children,
  align = "left",
  width = "auto",
  className,
  disabled = false,
}: CustomDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerId = useId();
  const menuId = useId();

  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const alignmentClass =
    align === "right"
      ? "right-0 origin-top-right"
      : align === "center"
        ? "left-1/2 -translate-x-1/2 origin-top"
        : "left-0 origin-top-left";

  const widthClass =
    width === "trigger"
      ? "w-full"
      : width === "sm"
        ? "w-48"
        : width === "md"
          ? "w-64"
          : width === "lg"
            ? "w-80"
            : "min-w-[12rem]";

  return (
    <DropdownContext.Provider
      value={{ open, setOpen, close, triggerId, menuId }}
    >
      <div
        ref={containerRef}
        className={cn("relative inline-block text-left", className)}
      >
        {trigger && (
          <div
            onClick={() => {
              if (!disabled) setOpen((prev) => !prev);
            }}
          >
            {trigger}
          </div>
        )}

        {open && (
          <div
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            className={cn(
              "animate-in fade-in zoom-in-95 absolute z-40 mt-1.5 flex flex-col gap-0.5 rounded-xl border border-dotted border-zinc-700/80 bg-[#121318] p-1.5 shadow-2xl backdrop-blur-xl duration-100 ease-out",
              alignmentClass,
              widthClass,
            )}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  );
}

export function DropdownSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col py-1", className)}>
      {title && (
        <span className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase select-none">
          {title}
        </span>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export interface DropdownItemProps {
  label: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  badge?: string;
  active?: boolean;
  disabled?: boolean;
  variant?: "default" | "accent" | "danger";
  onClick?: () => void;
  className?: string;
}

export function DropdownItem({
  label,
  description,
  icon,
  shortcut,
  badge,
  active = false,
  disabled = false,
  variant = "default",
  onClick,
  className,
}: DropdownItemProps) {
  const { close } = useDropdownContext();

  const variantClass =
    variant === "danger"
      ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
      : variant === "accent"
        ? "text-zinc-100 hover:bg-zinc-800 hover:text-white font-medium"
        : active
          ? "bg-zinc-800 text-white font-medium border border-dotted border-zinc-600"
          : "text-zinc-300 hover:bg-zinc-800/70 hover:text-white";

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (!disabled && onClick) {
          onClick();
          close();
        }
      }}
      className={cn(
        "group flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors duration-100 outline-none select-none disabled:pointer-events-none disabled:opacity-40",
        variantClass,
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="shrink-0 text-zinc-400 transition-colors group-hover:text-white">
            {icon}
          </span>
        )}
        <div className="flex min-w-0 flex-col">
          <span className="truncate">{label}</span>
          {description && (
            <span className="truncate text-[10px] text-zinc-500">
              {description}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {badge && (
          <span className="font-mono text-[10px] text-zinc-400">
            {badge}
          </span>
        )}
        {shortcut && (
          <kbd className="rounded border border-dotted border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            {shortcut}
          </kbd>
        )}
      </div>
    </button>
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      className={cn("-mx-1 my-1 h-px bg-zinc-800/80", className)}
    />
  );
}

export interface DropdownSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface DropdownSelectProps {
  value: string;
  options: DropdownSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
}

export function DropdownSelect({
  value,
  options,
  onChange,
  placeholder = "Select an option…",
  disabled = false,
  className,
  searchable = false,
}: DropdownSelectProps) {
  const [query, setQuery] = useState("");
  const selectedOption = options.find((opt) => opt.value === value);

  const filtered = searchable
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  return (
    <CustomDropdown
      disabled={disabled}
      width="trigger"
      className={cn("w-full", className)}
      trigger={
        <button
          type="button"
          disabled={disabled}
          className="flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border border-dotted border-zinc-700 bg-[#121318] px-3 py-1.5 text-xs text-zinc-200 transition-all duration-150 outline-none hover:border-zinc-500 hover:bg-[#181920] focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <div className="flex items-center gap-2 truncate">
            {selectedOption?.icon && (
              <span className="shrink-0">{selectedOption.icon}</span>
            )}
            <span className="truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <svg
            className="h-3.5 w-3.5 shrink-0 text-zinc-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      }
    >
      {searchable && (
        <div className="border-b border-dotted border-zinc-800 p-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded border border-dotted border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-zinc-400"
          />
        </div>
      )}
      <div className="max-h-60 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-zinc-500">
            No results found
          </div>
        ) : (
          filtered.map((opt) => (
            <DropdownItem
              key={opt.value}
              label={opt.label}
              description={opt.description}
              icon={opt.icon}
              badge={opt.badge}
              active={opt.value === value}
              onClick={() => onChange(opt.value)}
            />
          ))
        )}
      </div>
    </CustomDropdown>
  );
}

export default CustomDropdown;
