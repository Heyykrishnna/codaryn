import { z } from "zod";

export const sourceEvidenceSchema = z
  .object({
    path: z.string().min(1),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  })
  .refine((value) => value.endLine >= value.startLine, {
    message: "End line must not precede start line",
  });
export const resolutionSchema = z.enum([
  "DIRECT",
  "RESOLVED",
  "INFERRED",
  "PARTIAL",
  "UNRESOLVED",
]);
export const graphNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  label: z.string().min(1),
});
export const graphEdgeSchema = z
  .object({
    id: z.string().min(1),
    sourceId: z.string().min(1),
    targetId: z.string().min(1),
    kind: z.string().min(1),
    resolution: resolutionSchema,
    evidence: z.array(sourceEvidenceSchema),
  })
  .refine(
    (edge) =>
      !["DIRECT", "RESOLVED"].includes(edge.resolution) ||
      edge.evidence.length > 0,
    { message: "Confirmed relationships require evidence" },
  );
export const diagnosticSchema = z.object({
  message: z.string().min(1),
  severity: z.enum(["error", "warning", "info"]),
  evidence: sourceEvidenceSchema.optional(),
});
export const healthResponseSchema = z.object({ status: z.literal("ok") });
export const apiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export const sessionSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  expiresAt: z.iso.datetime(),
});
export type SourceEvidence = z.infer<typeof sourceEvidenceSchema>;
export type Resolution = z.infer<typeof resolutionSchema>;
export type AnalysisDiagnostic = z.infer<typeof diagnosticSchema>;
export interface AnalysisContext {
  readonly repositoryId: string;
  readonly commitSha: string;
}
export interface AnalyzerResult {
  readonly diagnostics: readonly AnalysisDiagnostic[];
}
export interface Analyzer {
  readonly id: string;
  readonly version: string;
  supports(context: AnalysisContext): Promise<boolean>;
  analyze(context: AnalysisContext): Promise<AnalyzerResult>;
}

export const analysisConfigurationSchema = z.strictObject({
  depth: z.enum(["overview", "standard", "deep"]),
  includeTests: z.boolean(),
  excludeGenerated: z.boolean(),
});
export const configurationResponseSchema = z.strictObject({
  configuration: analysisConfigurationSchema,
});
export const graphIdentityInputSchema = z.strictObject({
  repositoryId: z.string().min(1),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  kind: z.string().min(1),
  path: z.string().min(1),
  symbol: z.string().min(1),
  startLine: z.number().int().positive(),
  startColumn: z.number().int().positive(),
});
export function graphIdentity(
  input: z.infer<typeof graphIdentityInputSchema>,
): string {
  const value = graphIdentityInputSchema.parse(input);
  return [
    "v1",
    value.repositoryId,
    value.commitSha,
    value.kind,
    value.path,
    value.symbol,
    String(value.startLine),
    String(value.startColumn),
  ]
    .map(encodeURIComponent)
    .join(":");
}

export const workspaceRoleSchema = z.enum(["owner", "admin", "member"]);
export const workspaceSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  role: workspaceRoleSchema,
});
export const workspaceListSchema = z.object({
  workspaces: z.array(workspaceSchema),
  active: z.uuid().nullable(),
});
export const workspaceDetailsSchema = workspaceSchema.extend({
  members: z.array(z.object({ userId: z.string(), role: workspaceRoleSchema })),
  events: z.array(
    z.object({
      action: z.string(),
      actorId: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export const workspaceInvitationsSchema = z.object({
  invitations: z.array(
    z.object({ id: z.uuid(), name: z.string(), role: z.string() }),
  ),
});
export type WorkspaceDetails = z.infer<typeof workspaceDetailsSchema>;
export type WorkspaceSummary = z.infer<typeof workspaceSchema>;

export const githubConfigurationSchema = z.object({
  enabled: z.boolean(),
  installationUrl: z.url().nullable(),
});
export const githubInstallationListSchema = z.object({
  installations: z.array(z.object({ id: z.string(), connected: z.boolean() })),
});
export const repositoryListSchema = z.object({
  repositories: z.array(
    z.object({
      id: z.uuid(),
      fullName: z.string(),
      private: z.boolean(),
      defaultBranch: z.string(),
      installationId: z.string(),
    }),
  ),
});
export const branchListSchema = z.object({
  branches: z.array(
    z.object({ name: z.string(), sha: z.string().regex(/^[a-f0-9]{40}$/) }),
  ),
});
export const commitListSchema = z.object({
  commits: z.array(
    z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/), message: z.string() }),
  ),
});
export const ingestionRunListSchema = z.object({
  runs: z.array(
    z.object({
      id: z.uuid(),
      commitSha: z.string(),
      status: z.enum(["queued", "running", "completed", "failed"]),
      errorCode: z.string().nullable(),
      createdAt: z.string(),
      inventory: z
        .object({
          fileCount: z.number(),
          packageRoots: z.array(z.string()),
          archiveSha256: z.string(),
          monorepo: z.boolean(),
        })
        .nullable(),
    }),
  ),
});
