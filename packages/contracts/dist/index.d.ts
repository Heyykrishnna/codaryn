import { z } from "zod";
export * from "./evidence.js";
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
export declare const analysisConfigurationSchema: z.ZodObject<{
    depth: z.ZodEnum<{
        overview: "overview";
        standard: "standard";
        deep: "deep";
    }>;
    includeTests: z.ZodBoolean;
    excludeGenerated: z.ZodBoolean;
}, z.core.$strict>;
export declare const configurationResponseSchema: z.ZodObject<{
    configuration: z.ZodObject<{
        depth: z.ZodEnum<{
            overview: "overview";
            standard: "standard";
            deep: "deep";
        }>;
        includeTests: z.ZodBoolean;
        excludeGenerated: z.ZodBoolean;
    }, z.core.$strict>;
}, z.core.$strict>;
export declare const graphIdentityInputSchema: z.ZodObject<{
    repositoryId: z.ZodString;
    commitSha: z.ZodString;
    kind: z.ZodString;
    path: z.ZodString;
    symbol: z.ZodString;
    startLine: z.ZodNumber;
    startColumn: z.ZodNumber;
}, z.core.$strict>;
export declare function graphIdentity(input: z.infer<typeof graphIdentityInputSchema>): string;
export declare const workspaceRoleSchema: z.ZodEnum<{
    owner: "owner";
    admin: "admin";
    member: "member";
}>;
export declare const workspaceSchema: z.ZodObject<{
    id: z.ZodUUID;
    name: z.ZodString;
    role: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        member: "member";
    }>;
}, z.core.$strip>;
export declare const workspaceListSchema: z.ZodObject<{
    workspaces: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        role: z.ZodEnum<{
            owner: "owner";
            admin: "admin";
            member: "member";
        }>;
    }, z.core.$strip>>;
    active: z.ZodNullable<z.ZodUUID>;
}, z.core.$strip>;
export declare const workspaceDetailsSchema: z.ZodObject<{
    id: z.ZodUUID;
    name: z.ZodString;
    role: z.ZodEnum<{
        owner: "owner";
        admin: "admin";
        member: "member";
    }>;
    members: z.ZodArray<z.ZodObject<{
        userId: z.ZodString;
        role: z.ZodEnum<{
            owner: "owner";
            admin: "admin";
            member: "member";
        }>;
    }, z.core.$strip>>;
    events: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        action: z.ZodString;
        actorId: z.ZodString;
        createdAt: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const workspaceInvitationsSchema: z.ZodObject<{
    invitations: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        name: z.ZodString;
        role: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WorkspaceDetails = z.infer<typeof workspaceDetailsSchema>;
export type WorkspaceSummary = z.infer<typeof workspaceSchema>;
export declare const githubConfigurationSchema: z.ZodObject<{
    enabled: z.ZodBoolean;
    installationUrl: z.ZodNullable<z.ZodURL>;
}, z.core.$strip>;
export declare const githubInstallationListSchema: z.ZodObject<{
    installations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        connected: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const repositoryListSchema: z.ZodObject<{
    repositories: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        fullName: z.ZodString;
        private: z.ZodBoolean;
        defaultBranch: z.ZodString;
        installationId: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const branchListSchema: z.ZodObject<{
    branches: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        sha: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const commitListSchema: z.ZodObject<{
    commits: z.ZodArray<z.ZodObject<{
        sha: z.ZodString;
        message: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ingestionRunListSchema: z.ZodObject<{
    runs: z.ZodArray<z.ZodObject<{
        id: z.ZodUUID;
        commitSha: z.ZodString;
        status: z.ZodEnum<{
            completed: "completed";
            queued: "queued";
            running: "running";
            failed: "failed";
        }>;
        errorCode: z.ZodNullable<z.ZodString>;
        createdAt: z.ZodString;
        inventory: z.ZodNullable<z.ZodObject<{
            fileCount: z.ZodNumber;
            packageRoots: z.ZodArray<z.ZodString>;
            archiveSha256: z.ZodString;
            monorepo: z.ZodBoolean;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export * from "./studio.js";
export * from "./analysis.js";
export * from "./graph.js";
export * from "./frontend.js";
export * from "./backend.js";
