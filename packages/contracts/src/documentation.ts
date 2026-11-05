import { z } from "zod";
import { sourceEvidenceSchema } from "./evidence.js";

export const documentTemplateIdSchema = z.enum([
  "overview",
  "architecture",
  "frontend",
  "backend",
  "api",
  "schema",
  "dependencies",
  "execution",
  "infrastructure",
  "security",
]);

export type DocumentTemplateId = z.infer<typeof documentTemplateIdSchema>;

export const documentSectionSchema = z.strictObject({
  id: z.string().min(1).max(128),
  title: z.string().min(1).max(256),
  level: z.number().int().min(1).max(6),
  content: z.string(),
  evidence: z.array(sourceEvidenceSchema).default([]),
  diagramPreview: z.string().optional(),
});

export type DocumentSection = z.infer<typeof documentSectionSchema>;

export const documentMetadataSchema = z.strictObject({
  generatedAt: z.string().datetime(),
  analyzerVersion: z.string().min(1).max(32),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  repositoryName: z.string().min(1).max(256),
  wordCount: z.number().int().nonnegative(),
  evidenceCount: z.number().int().nonnegative(),
  uncertaintyCount: z.number().int().nonnegative(),
});

export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;

export const generatedDocumentSchema = z.strictObject({
  id: z.string().uuid(),
  templateId: documentTemplateIdSchema,
  title: z.string().min(1).max(256),
  version: z.number().int().positive(),
  jobId: z.string().uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  sections: z.array(documentSectionSchema),
  markdown: z.string(),
  metadata: documentMetadataSchema,
});

export type GeneratedDocument = z.infer<typeof generatedDocumentSchema>;

export const documentSearchQuerySchema = z.strictObject({
  query: z.string().trim().min(1).max(100),
  templateId: documentTemplateIdSchema.optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export type DocumentSearchQuery = z.infer<typeof documentSearchQuerySchema>;

export const documentSearchResultSchema = z.strictObject({
  templateId: documentTemplateIdSchema,
  documentTitle: z.string().min(1).max(256),
  sectionId: z.string().min(1).max(128),
  sectionTitle: z.string().min(1).max(256),
  snippet: z.string().min(1).max(1024),
  score: z.number().positive(),
  evidence: sourceEvidenceSchema.optional(),
});

export type DocumentSearchResult = z.infer<typeof documentSearchResultSchema>;

export const exportFormatSchema = z.enum([
  "svg",
  "png",
  "pdf",
  "markdown",
  "mermaid",
  "dbml",
  "json",
]);

export type ExportFormat = z.infer<typeof exportFormatSchema>;

export const exportTypeSchema = z.enum(["diagram", "document", "bundle"]);

export type ExportType = z.infer<typeof exportTypeSchema>;

export const exportJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
]);

export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>;

export const exportRequestSchema = z.strictObject({
  jobId: z.string().uuid(),
  exportType: exportTypeSchema,
  format: exportFormatSchema,
  targetId: z.string().min(1).max(128),
  layoutId: z.string().uuid().optional(),
});

export type ExportRequest = z.infer<typeof exportRequestSchema>;

export const exportJobResponseSchema = z.strictObject({
  id: z.string().uuid(),
  jobId: z.string().uuid(),
  exportType: exportTypeSchema,
  format: exportFormatSchema,
  targetId: z.string().min(1).max(128),
  status: exportJobStatusSchema,
  artifactSize: z.number().int().nonnegative().optional(),
  artifactHash: z.string().regex(/^[a-f0-9]{64}$/).optional(),
  errorMessage: z.string().max(512).optional(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});

export type ExportJobResponse = z.infer<typeof exportJobResponseSchema>;
