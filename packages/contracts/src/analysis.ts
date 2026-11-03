import { z } from "zod";

export const sourceLocationSchema = z
  .object({
    path: z.string().min(1),
    startLine: z.number().int().positive(),
    startColumn: z.number().int().positive(),
    endLine: z.number().int().positive(),
    endColumn: z.number().int().positive(),
  })
  .refine(
    (loc) =>
      loc.endLine > loc.startLine ||
      (loc.endLine === loc.startLine && loc.endColumn >= loc.startColumn),
    { message: "End position must not precede start position" },
  );

export type SourceLocation = z.infer<typeof sourceLocationSchema>;

export const fileLanguageSchema = z.enum([
  "typescript",
  "tsx",
  "javascript",
  "jsx",
  "json",
  "unknown",
]);

export type FileLanguage = z.infer<typeof fileLanguageSchema>;

export const fileRoleSchema = z.enum([
  "source",
  "test",
  "config",
  "declaration",
  "asset",
  "documentation",
  "other",
]);

export type FileRole = z.infer<typeof fileRoleSchema>;

export const sourceFileClassificationSchema = z.object({
  path: z.string().min(1),
  extension: z.string(),
  language: fileLanguageSchema,
  role: fileRoleSchema,
  sizeBytes: z.number().int().nonnegative(),
  frameworks: z.array(z.string()),
  linesOfCode: z.number().int().nonnegative(),
});

export type SourceFileClassification = z.infer<
  typeof sourceFileClassificationSchema
>;

export const functionParameterSchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  optional: z.boolean(),
  defaultValue: z.string().optional(),
});

export type FunctionParameter = z.infer<typeof functionParameterSchema>;

export const functionSymbolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["function", "method"]),
  parameters: z.array(functionParameterSchema),
  returnType: z.string(),
  modifiers: z.array(z.string()),
  isAsync: z.boolean(),
  isGenerator: z.boolean(),
  location: sourceLocationSchema,
  parentName: z.string().optional(),
});

export type FunctionSymbol = z.infer<typeof functionSymbolSchema>;

export const classPropertySchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  modifiers: z.array(z.string()),
  optional: z.boolean(),
});

export type ClassProperty = z.infer<typeof classPropertySchema>;

export const classSymbolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  extends: z.string().optional(),
  implements: z.array(z.string()),
  methods: z.array(functionSymbolSchema),
  properties: z.array(classPropertySchema),
  modifiers: z.array(z.string()),
  location: sourceLocationSchema,
});

export type ClassSymbol = z.infer<typeof classSymbolSchema>;

export const typePropertySchema = z.object({
  name: z.string().min(1),
  type: z.string(),
  optional: z.boolean(),
  readonly: z.boolean(),
});

export type TypeProperty = z.infer<typeof typePropertySchema>;

export const interfaceSymbolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  extends: z.array(z.string()),
  properties: z.array(typePropertySchema),
  methods: z.array(functionSymbolSchema),
  location: sourceLocationSchema,
});

export type InterfaceSymbol = z.infer<typeof interfaceSymbolSchema>;

export const typeAliasSymbolSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.string(),
  location: sourceLocationSchema,
});

export type TypeAliasSymbol = z.infer<typeof typeAliasSymbolSchema>;

export const importExportSpecifierSchema = z.object({
  name: z.string().min(1),
  alias: z.string().optional(),
});

export const importExportSymbolSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["import", "export"]),
  moduleSpecifier: z.string(),
  isTypeOnly: z.boolean(),
  isDefault: z.boolean(),
  isNamespace: z.boolean(),
  specifiers: z.array(importExportSpecifierSchema),
  location: sourceLocationSchema,
});

export type ImportExportSymbol = z.infer<typeof importExportSymbolSchema>;

export const astDiagnosticSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  message: z.string().min(1),
  severity: z.enum(["error", "warning", "info"]),
  code: z.string().min(1),
  location: sourceLocationSchema.optional(),
});

export type AstDiagnostic = z.infer<typeof astDiagnosticSchema>;

export const tsconfigInfoSchema = z.object({
  path: z.string().min(1),
  compilerOptions: z.record(z.string(), z.unknown()),
  projectReferences: z.array(z.string()),
  include: z.array(z.string()),
  exclude: z.array(z.string()),
  sourceFileCount: z.number().int().nonnegative(),
});

export type TsconfigInfo = z.infer<typeof tsconfigInfoSchema>;

export const analysisStageIdSchema = z.enum([
  "inventory",
  "configuration",
  "parsing",
  "symbols",
  "diagnostics",
  "completed",
]);

export type AnalysisStageId = z.infer<typeof analysisStageIdSchema>;

export const analysisJobStatusSchema = z.enum([
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export type AnalysisJobStatus = z.infer<typeof analysisJobStatusSchema>;

export const analysisStageStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export type AnalysisStageStatus = z.infer<typeof analysisStageStatusSchema>;

export const stageProgressSchema = z.object({
  stage: analysisStageIdSchema,
  status: analysisStageStatusSchema,
  itemsTotal: z.number().int().nonnegative(),
  itemsCompleted: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative().optional(),
  message: z.string().optional(),
});

export type StageProgress = z.infer<typeof stageProgressSchema>;

export const analysisJobSummarySchema = z.object({
  id: z.uuid(),
  manifestId: z.uuid(),
  repositoryId: z.uuid(),
  status: analysisJobStatusSchema,
  currentStage: analysisStageIdSchema,
  stages: z.array(stageProgressSchema),
  fileCount: z.number().int().nonnegative(),
  symbolCount: z.number().int().nonnegative(),
  diagnosticCount: z.number().int().nonnegative(),
  retries: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  failureReason: z.string().nullable(),
});

export type AnalysisJobSummary = z.infer<typeof analysisJobSummarySchema>;

export const analysisJobLogSchema = z.object({
  timestamp: z.string(),
  level: z.enum(["info", "warn", "error"]),
  stage: analysisStageIdSchema,
  message: z.string().min(1),
});

export type AnalysisJobLog = z.infer<typeof analysisJobLogSchema>;

export const startAnalysisInputSchema = z.object({
  manifestId: z.uuid(),
  repositoryId: z.uuid(),
  workspaceId: z.uuid(),
  ref: z.string().trim().min(1).max(200),
});

export type StartAnalysisInput = z.infer<typeof startAnalysisInputSchema>;

export const fileInventorySummarySchema = z.object({
  totalFiles: z.number().int().nonnegative(),
  totalLines: z.number().int().nonnegative(),
  byLanguage: z.record(z.string(), z.number().int().nonnegative()),
  byRole: z.record(z.string(), z.number().int().nonnegative()),
});

export const fileInventoryResponseSchema = z.object({
  jobId: z.uuid(),
  files: z.array(sourceFileClassificationSchema),
  summary: fileInventorySummarySchema,
});

export type FileInventoryResponse = z.infer<typeof fileInventoryResponseSchema>;

export const symbolInventoryResponseSchema = z.object({
  jobId: z.uuid(),
  functions: z.array(functionSymbolSchema),
  classes: z.array(classSymbolSchema),
  interfaces: z.array(interfaceSymbolSchema),
  types: z.array(typeAliasSymbolSchema),
  importsExports: z.array(importExportSymbolSchema),
  totalCount: z.number().int().nonnegative(),
});

export type SymbolInventoryResponse = z.infer<
  typeof symbolInventoryResponseSchema
>;

export const diagnosticsResponseSchema = z.object({
  jobId: z.uuid(),
  diagnostics: z.array(astDiagnosticSchema),
  errorCount: z.number().int().nonnegative(),
  warningCount: z.number().int().nonnegative(),
});

export type DiagnosticsResponse = z.infer<typeof diagnosticsResponseSchema>;
