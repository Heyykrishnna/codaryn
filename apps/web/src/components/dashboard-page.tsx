import type { ReactNode } from "react";

export function DashboardPage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {children}
    </main>
  );
}

export function DashboardHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="border-border flex flex-col gap-4 border-b border-dotted pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted max-w-xl text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children && <div className="w-full min-w-0 sm:w-60">{children}</div>}
    </header>
  );
}
