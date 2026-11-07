import ts from "typescript";
import {
  createVirtualCompilerHost,
  normalizeVirtualPath,
  type VirtualFileSystem,
} from "./host.js";

export type AnalysisProgramResult = {
  program: ts.Program;
  host: ts.CompilerHost;
  rootFileNames: string[];
};

export function createAnalysisProgram(
  files: VirtualFileSystem,
  rootFileNames?: string[],
  options?: ts.CompilerOptions,
): AnalysisProgramResult {
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    allowJs: true,
    checkJs: false,
    skipLibCheck: true,
    noEmit: true,
    ...options,
  };

  const host = createVirtualCompilerHost(files, compilerOptions);

  const resolvedRoots = (
    rootFileNames ??
    [...files.keys()].filter((f) => {
      const norm = normalizeVirtualPath(f);
      return (
        norm.endsWith(".ts") ||
        norm.endsWith(".tsx") ||
        norm.endsWith(".mts") ||
        norm.endsWith(".cts") ||
        norm.endsWith(".js") ||
        norm.endsWith(".jsx") ||
        norm.endsWith(".mjs") ||
        norm.endsWith(".cjs")
      );
    })
  ).map((f) => normalizeVirtualPath(f));

  const program = ts.createProgram({
    rootNames: resolvedRoots,
    options: compilerOptions,
    host,
  });

  return {
    program,
    host,
    rootFileNames: resolvedRoots,
  };
}
