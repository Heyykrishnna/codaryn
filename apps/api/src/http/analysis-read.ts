import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { z } from "zod";
import { WorkspaceAccessError } from "@codaryn/database";
import { requireSession, requestError, type SessionReader } from "./access.js";
export async function authorizeAnalysisRead(
  pool: Pool,
  actor: string,
  workspace: string,
  job: string,
) {
  const result = await pool.query(
    "SELECT j.id FROM analysis_jobs j JOIN organizations o ON o.id=j.organization_id JOIN organization_members m ON m.organization_id=o.id JOIN connected_repositories r ON r.id=j.repository_id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=o.id WHERE j.id=$1 AND o.id=$2 AND m.user_id=$3 AND o.deleted_at IS NULL AND j.status<>'cancelled' AND r.active=true AND i.connected=true",
    [job, workspace, actor],
  );
  if (!result.rowCount) throw new WorkspaceAccessError();
}
export function protectAnalysisReads(
  app: FastifyInstance,
  auth: SessionReader,
  authorize: (actor: string, workspace: string, job: string) => Promise<void>,
  origin: string,
  scope: string,
) {
  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.split("?")[0].startsWith(`/api/v1/${scope}/`)) return;
    const session = await requireSession(auth, request, reply, origin);
    if (!session) return reply;
    try {
      const input = z
        .object({ workspaceId: z.uuid(), jobId: z.uuid() })
        .parse(request.query);
      await authorize(session.user.id, input.workspaceId, input.jobId);
    } catch (error) {
      return requestError(reply, error);
    }
  });
}
