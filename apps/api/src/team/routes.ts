import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sanitizeFilename } from "@codaryn/export-engine";
import { workspaceControlsSchema } from "@codaryn/contracts";
import {
  requireSession,
  requestError,
  RequestFailure,
  type SessionReader,
} from "../http/access.js";
import type { AdministrationService } from "./administration.js";
import type { SharingService } from "./sharing.js";
import type { DownloadService } from "./downloads.js";
import type { RetentionService } from "./retention.js";
export function registerTeam(
  app: FastifyInstance,
  auth: SessionReader,
  services: {
    administration: AdministrationService;
    sharing: SharingService;
    downloads: DownloadService;
    retention: RetentionService;
  },
  origin: string,
) {
  app.get("/api/v1/team/:action", async (request, reply) => {
    const session = await requireSession(auth, request, reply, origin);
    if (!session) return reply;
    try {
      const { action } = z
          .object({
            action: z.enum([
              "overview",
              "members",
              "activity",
              "usage",
              "catalog",
              "shares",
              "retention-preview",
            ]),
          })
          .parse(request.params),
        q = z
          .object({
            workspaceId: z.uuid(),
            page: z.coerce.number().int().min(1).max(1000).default(1),
            kind: z
              .enum(["versions", "views", "exports", "presets"])
              .default("versions"),
          })
          .parse(request.query),
        actor = session.user.id;
      switch (action) {
        case "overview":
          return await services.administration.overview(actor, q.workspaceId);
        case "members":
          return await services.administration.members(
            actor,
            q.workspaceId,
            q.page,
          );
        case "activity":
          return await services.administration.activity(
            actor,
            q.workspaceId,
            q.page,
          );
        case "usage":
          return await services.administration.usage(actor, q.workspaceId);
        case "catalog":
          return await services.administration.catalog(
            actor,
            q.workspaceId,
            q.kind,
            q.page,
          );
        case "shares":
          return await services.sharing.list(actor, q.workspaceId, q.page);
        case "retention-preview":
          return await services.retention.preview(actor, q.workspaceId);
      }
    } catch (error) {
      return requestError(reply, error);
    }
  });
  app.post(
    "/api/v1/team/:action",
    { bodyLimit: 8192 },
    async (request, reply) => {
      const session = await requireSession(auth, request, reply, origin);
      if (!session) return reply;
      try {
        const { action } = z
            .object({
              action: z.enum([
                "settings",
                "share",
                "share-revoke",
                "shared",
                "grant",
                "grant-revoke",
                "redeem",
                "retention-apply",
              ]),
            })
            .parse(request.params),
          actor = session.user.id,
          base = { workspaceId: z.uuid() };
        if (["settings", "retention-apply"].includes(action)) {
          const age = Date.now() - session.session.createdAt.getTime();
          if (!Number.isFinite(age) || age > 3600000 || age < -30000)
            throw new RequestFailure(
              403,
              "REAUTHENTICATE",
              "Sign out and sign in again before changing workspace controls or deleting retained data",
            );
        }
        if (action === "shared") {
          const b = z
            .strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
            .parse(request.body);
          return await services.sharing.open(actor, b.token);
        }
        if (action === "redeem") {
          const b = z
              .strictObject({
                id: z.uuid(),
                signature: z.string().regex(/^[a-f0-9]{64}$/),
              })
              .parse(request.body),
            artifact = await services.downloads.redeem(
              actor,
              b.id,
              b.signature,
            );
          return reply
            .header("Content-Type", artifact.content_type)
            .header(
              "Content-Disposition",
              `attachment; filename="${sanitizeFilename(artifact.filename)}"`,
            )
            .header("Content-Length", String(artifact.size))
            .header("Referrer-Policy", "no-referrer")
            .header("X-Content-Type-Options", "nosniff")
            .send(artifact.payload);
        }
        if (action === "settings") {
          const b = z
            .strictObject({ ...base, ...workspaceControlsSchema.shape })
            .parse(request.body);
          return await services.administration.configure(
            actor,
            b.workspaceId,
            workspaceControlsSchema.parse({
              revision: b.revision,
              retentionDays: b.retentionDays,
              retentionEnabled: b.retentionEnabled,
              allowMemberSharing: b.allowMemberSharing,
              allowMemberExports: b.allowMemberExports,
            }),
          );
        }
        if (action === "share") {
          const b = z
            .strictObject({
              ...base,
              kind: z.enum(["version", "diagram"]),
              resourceId: z.uuid(),
              recipientId: z.uuid(),
              hours: z.number().int().min(1).max(168).default(24),
            })
            .parse(request.body);
          return await services.sharing.create(
            actor,
            b.workspaceId,
            b.kind,
            b.resourceId,
            b.recipientId,
            b.hours,
          );
        }
        if (action === "grant") {
          const b = z
            .strictObject({ ...base, exportId: z.uuid() })
            .parse(request.body);
          return await services.downloads.issue(
            actor,
            b.workspaceId,
            b.exportId,
          );
        }
        if (action === "retention-apply") {
          const b = z
            .strictObject({
              ...base,
              revision: z.number().int().nonnegative(),
              hash: z.string().regex(/^[a-f0-9]{64}$/),
            })
            .parse(request.body);
          return await services.retention.apply(
            actor,
            b.workspaceId,
            b.revision,
            b.hash,
          );
        }
        const b = z.strictObject({ ...base, id: z.uuid() }).parse(request.body);
        return action === "share-revoke"
          ? await services.sharing.revoke(actor, b.workspaceId, b.id)
          : await services.downloads.revoke(actor, b.workspaceId, b.id);
      } catch (error) {
        return requestError(reply, error);
      }
    },
  );
}
