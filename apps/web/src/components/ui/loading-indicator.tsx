import { cn } from "@/lib/utils";

export function LoadingIndicator({
  label = "Loading…",
  description,
  variant = "card",
  className,
}: {
  label?: string;
  description?: string;
  variant?: "card" | "inline";
  className?: string;
}) {
  const inline = variant === "inline";

  return (
    <div
      role="status"
      className={cn(
        inline
          ? "inline-flex items-center gap-2.5 text-sm"
          : "border-border bg-card flex min-h-36 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dotted px-5 py-8 text-center text-sm",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block shrink-0 rounded-full border-2 border-neutral-200 border-t-neutral-700 motion-safe:animate-spin",
          inline ? "size-4" : "size-6",
        )}
      />
      <div>
        <p className="text-foreground font-medium">{label}</p>
        {description && (
          <p className="text-muted mt-1 text-xs">{description}</p>
        )}
      </div>
    </div>
  );
}
