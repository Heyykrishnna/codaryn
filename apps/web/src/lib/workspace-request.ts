import { z } from "zod";

type ApiScope =
  "studio" | "analysis" | "graph" | "frontend" | "backend" | "schema";
export async function workspaceRequest(
  scope: ApiScope,
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
  mutation = false,
  fallback = "The request failed. Reload and try again.",
): Promise<unknown> {
  const query = new URLSearchParams({ workspaceId });
  for (const [key, value] of Object.entries(input)) {
    if (!mutation && value !== undefined && value !== null)
      query.set(key, String(value));
  }
  const response = await fetch(`/api/v1/${scope}/${action}?${query}`, {
    method: mutation ? "POST" : "GET",
    headers: mutation
      ? { "content-type": "application/json", "x-codaryn-request": "workspace" }
      : {},
    ...(mutation ? { body: JSON.stringify({ ...input, workspaceId }) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(await response.json().catch(() => null));
    throw new Error(error.success ? error.data.error.message : fallback);
  }
  return response.json();
}
