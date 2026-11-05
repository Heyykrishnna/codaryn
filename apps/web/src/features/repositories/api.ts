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
  "rounded-lg border border-[#2b2f3d] bg-[#14161f] px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 transition-colors";

export const button =
  "inline-flex items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 border border-zinc-200 shadow-[0_2px_0_0_#d4d4d8] hover:bg-zinc-100 active:translate-y-[1px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0e12] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer";

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
