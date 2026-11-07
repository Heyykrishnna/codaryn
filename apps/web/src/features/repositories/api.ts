export async function api(
  path: string,
  input: Record<string, string>,
  mutation = false,
  signal?: AbortSignal,
): Promise<unknown> {
  const query = mutation ? "" : "?" + new URLSearchParams(input).toString();
  const response = await fetch(`/api/v1/github/${path}${query}`, {
    method: mutation ? "POST" : "GET",
    headers: mutation
      ? { "content-type": "application/json", "x-codaryn-request": "workspace" }
      : {},
    ...(mutation ? { body: JSON.stringify(input) } : {}),
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
      : AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const messages: Record<number, string> = {
      429: "GitHub rate limit reached. Wait before retrying.",
      401: "Your session expired. Sign in again.",
      503: "The GitHub App has not been configured.",
    };
    throw new Error(
      messages[response.status] ??
        "The request failed. Verify your GitHub permissions and try again.",
    );
  }
  return response.json();
}

export const control =
  "min-h-9 min-w-0 max-w-full rounded-md border border-dotted border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 disabled:opacity-50 motion-safe:transition-colors";

export const button =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-dotted border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white shadow-[0_2px_0_#525252] hover:bg-neutral-800 motion-safe:active:translate-y-px active:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 disabled:opacity-50 disabled:pointer-events-none motion-safe:transition-[background-color,translate,box-shadow] motion-safe:duration-150 motion-safe:ease-control cursor-pointer";

export type Repository = {
  id: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  installationId: string;
};

export type Run = {
  id: string;
  commitSha: string;
  status: string;
  errorCode: string | null;
  createdAt: string;
  inventory: {
    fileCount: number;
    packageRoots: string[];
    archiveSha256: string;
    monorepo: boolean;
  } | null;
};
