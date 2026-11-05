import ts from "typescript";
export function createExecutionProgram(files: Record<string, string>) {
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  if (
    entries.length > 10000 ||
    entries.reduce((n, [, text]) => n + Buffer.byteLength(text), 0) >
      50 * 1024 * 1024
  )
    throw new Error("Execution input limit exceeded");
  const sources = new Map<string, string>();
  for (const [path, text] of entries) {
    if (
      path.startsWith("/") ||
      path.includes("\\") ||
      path.split("/").includes("..") ||
      path.includes("\0")
    )
      throw new Error("Unsafe execution source path");
    if (Buffer.byteLength(text) > 2 * 1024 * 1024)
      throw new Error("Execution file limit exceeded");
    if (/\.[cm]?[jt]sx?$/.test(path)) sources.set(path, text);
  }
  const normalize = (path: string) => path.replace(/^\/+/, "");
  const host: ts.CompilerHost = {
    getSourceFile: (path, version) => {
      const text = sources.get(normalize(path));
      return text === undefined
        ? undefined
        : ts.createSourceFile(normalize(path), text, version, true);
    },
    getDefaultLibFileName: () => "",
    writeFile: () => {},
    getCurrentDirectory: () => "/",
    getDirectories: () => [],
    getCanonicalFileName: normalize,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    fileExists: (path) => sources.has(normalize(path)),
    readFile: (path) => sources.get(normalize(path)),
    directoryExists: (path) => {
      const directory = normalize(path).replace(/\/$/, "");
      return (
        directory === "" ||
        [...sources.keys()].some((key) => key.startsWith(directory + "/"))
      );
    },
  };
  return ts.createProgram(
    [...sources.keys()],
    {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowJs: true,
      noLib: true,
      noEmit: true,
      skipLibCheck: true,
    },
    host,
  );
}
