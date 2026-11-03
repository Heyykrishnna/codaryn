import { z } from "zod";
export async function studioRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
  mutation = false,
): Promise<unknown> {
  const query = new URLSearchParams({ workspaceId });
  for (const [key, value] of Object.entries(input))
    if (!mutation) query.set(key, String(value));
  const response = await fetch(`/api/v1/studio/${action}?${query}`, {
    method: mutation ? "POST" : "GET",
    headers: mutation
      ? { "content-type": "application/json", "x-codaryn-request": "workspace" }
      : {},
    ...(mutation ? { body: JSON.stringify({ workspaceId, ...input }) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const error = z
      .object({ error: z.object({ message: z.string() }) })
      .safeParse(await response.json().catch(() => null));
    throw new Error(
      error.success
        ? error.data.error.message
        : "The request failed. Reload and try again.",
    );
  }
  return response.json();
}
