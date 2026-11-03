export type Resolution = "DIRECT" | "RESOLVED" | "INFERRED" | "PARTIAL" | "UNRESOLVED";

export interface SourceEvidence {
  readonly path: string;
  readonly startLine: number;
  readonly endLine: number;
}

export interface AnalysisContext {
  readonly repositoryId: string;
  readonly commitSha: string;
}

export interface AnalysisDiagnostic {
  readonly message: string;
  readonly severity: "error" | "warning" | "info";
  readonly evidence?: SourceEvidence;
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
