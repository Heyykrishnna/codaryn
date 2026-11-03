import { z } from "zod";
export declare const sourceEvidenceSchema: z.ZodObject<{
    path: z.ZodString;
    startLine: z.ZodNumber;
    endLine: z.ZodNumber;
}, z.core.$strip>;
export declare const resolutionSchema: z.ZodEnum<{
    DIRECT: "DIRECT";
    RESOLVED: "RESOLVED";
    INFERRED: "INFERRED";
    PARTIAL: "PARTIAL";
    UNRESOLVED: "UNRESOLVED";
}>;
export declare const graphNodeSchema: z.ZodObject<{
    id: z.ZodString;
    kind: z.ZodString;
    label: z.ZodString;
}, z.core.$strip>;
export declare const graphEdgeSchema: z.ZodObject<{
    id: z.ZodString;
    sourceId: z.ZodString;
    targetId: z.ZodString;
    kind: z.ZodString;
    resolution: z.ZodEnum<{
        DIRECT: "DIRECT";
        RESOLVED: "RESOLVED";
        INFERRED: "INFERRED";
        PARTIAL: "PARTIAL";
        UNRESOLVED: "UNRESOLVED";
    }>;
    evidence: z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        startLine: z.ZodNumber;
        endLine: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const diagnosticSchema: z.ZodObject<{
    message: z.ZodString;
    severity: z.ZodEnum<{
        error: "error";
        warning: "warning";
        info: "info";
    }>;
    evidence: z.ZodOptional<z.ZodObject<{
        path: z.ZodString;
        startLine: z.ZodNumber;
        endLine: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const healthResponseSchema: z.ZodObject<{
    status: z.ZodLiteral<"ok">;
}, z.core.$strip>;
export declare const apiErrorSchema: z.ZodObject<{
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const sessionSchema: z.ZodObject<{
    userId: z.ZodString;
    workspaceId: z.ZodString;
    expiresAt: z.ZodISODateTime;
}, z.core.$strip>;
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
