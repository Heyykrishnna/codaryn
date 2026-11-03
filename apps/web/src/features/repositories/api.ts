export async function api(
  path: string,
  input: Record<string, string>,
  mutation = false,
): Promise<unknown> {
  const response = await fetch(
    `/api/v1/github/${path}${mutation ? "" : `?${new URLSearchParams(input)}`}`,
    {
      method: mutation ? "POST" : "GET",
      headers: mutation
        ? {
            "content-type": "application/json",
            "x-codaryn-request": "workspace",
          }
        : {},
      ...(mutation ? { body: JSON.stringify(input) } : {}),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "GitHub rate limit reached. Wait before retrying."
        : response.status === 401
          ? "Your session expired. Sign in again."
          : response.status === 503
            ? "The GitHub App has not been configured."
            : "The request failed. Verify your GitHub permissions and try again.",
    );
  return response.json();
}
export const control =
  "rounded-md border border-zinc-300 bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-zinc-700";
export const button =
  "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-50";
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
