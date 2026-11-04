import { workspaceRequest } from "@/src/lib/workspace-request";
export function studioRequest(
  action: string,
  workspaceId: string,
  input: Record<string, unknown> = {},
  mutation = false,
): Promise<unknown> {
  return workspaceRequest(
    "studio",
    action,
    workspaceId,
    input,
    mutation,
    "The request failed. Reload and try again.",
  );
}
