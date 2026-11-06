export async function api(
  path: string,
  input: Record<string, string>,
  mutation = false,
): Promise<unknown> {
  const query = mutation ? "" : "?" + new URLSearchParams(input).toString();
  const response = await fetch(`/api/v1/github/${path}${query}`, {
    method: mutation ? "POST" : "GET",
    headers: mutation
      ? { "content-type": "application/json", "x-codaryn-request": "workspace" }
      : {},
    ...(mutation ? { body: JSON.stringify(input) } : {}),
    cache: "no-store",
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
  "rounded-lg border border-dotted border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:opacity-40 transition-colors";

export const button =
  "inline-flex items-center justify-center rounded-lg bg-zinc-200 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-950 border border-dotted border-zinc-400 shadow-[0_2px_0_0_#71717a] hover:bg-white active:translate-y-[1px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer";

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
