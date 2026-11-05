import path from "node:path";
import ts from "typescript";

export type VirtualFileSystem = Map<string, string>;

export function normalizeVirtualPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = normalized.split("/");
  const safeParts: string[] = [];
  for (const part of parts) {
    if (part === "." || part === "") continue;
    if (part === "..") {
      if (safeParts.length > 0) safeParts.pop();
    } else {
      safeParts.push(part);
    }
  }
  return safeParts.join("/");
}

export function createVirtualCompilerHost(
  files: VirtualFileSystem,
  compilerOptions: ts.CompilerOptions = {},
): ts.CompilerHost {
  const normalizedFiles = new Map<string, string>();
  for (const [key, value] of files.entries()) {
    normalizedFiles.set(normalizeVirtualPath(key), value);
  }

  const defaultHost = ts.createCompilerHost(compilerOptions, true);
  const libraryDirectory = path.dirname(
    ts.getDefaultLibFilePath(compilerOptions),
  );
  const trustedLibrary = (fileName: string) =>
    path.dirname(path.resolve(fileName)) === libraryDirectory &&
    /^lib(?:\.[\w.-]+)?\.d\.ts$/.test(path.basename(fileName));

  return {
    getSourceFile(
      fileName: string,
      languageVersionOrOptions: ts.ScriptTarget | ts.CreateSourceFileOptions,
      onError?: (message: string) => void,
    ): ts.SourceFile | undefined {
      const normalized = normalizeVirtualPath(fileName);
      const content = normalizedFiles.get(normalized);
      if (content !== undefined) {
        return ts.createSourceFile(
          normalized,
          content,
          languageVersionOrOptions,
          true,
        );
      }
      return trustedLibrary(fileName)
        ? defaultHost.getSourceFile(fileName, languageVersionOrOptions, onError)
        : undefined;
    },
    getDefaultLibFileName(options: ts.CompilerOptions): string {
      return defaultHost.getDefaultLibFileName(options);
    },
    getDefaultLibLocation(): string {
      return defaultHost.getDefaultLibLocation
        ? defaultHost.getDefaultLibLocation()
        : "";
    },
    writeFile: () => {},
    getCurrentDirectory(): string {
      return "/";
    },
    getDirectories(dirPath: string): string[] {
      const normalizedDir = normalizeVirtualPath(dirPath);
      const prefix = normalizedDir === "" ? "" : `${normalizedDir}/`;
      const directories = new Set<string>();

      for (const filePath of normalizedFiles.keys()) {
        if (filePath.startsWith(prefix)) {
          const rest = filePath.slice(prefix.length);
          const slashIndex = rest.indexOf("/");
          if (slashIndex !== -1) {
            directories.add(rest.slice(0, slashIndex));
          }
        }
      }

      return [...directories].sort((a, b) => a.localeCompare(b));
    },
    getCanonicalFileName(fileName: string): string {
      return normalizeVirtualPath(fileName);
    },
    useCaseSensitiveFileNames(): boolean {
      return true;
    },
    getNewLine(): string {
      return "\n";
    },
    fileExists(fileName: string): boolean {
      const normalized = normalizeVirtualPath(fileName);
      return (
        normalizedFiles.has(normalized) ||
        (trustedLibrary(fileName) && defaultHost.fileExists(fileName))
      );
    },
    readFile(fileName: string): string | undefined {
      const normalized = normalizeVirtualPath(fileName);
      return (
        normalizedFiles.get(normalized) ??
        (trustedLibrary(fileName) ? defaultHost.readFile(fileName) : undefined)
      );
    },
    directoryExists(dirPath: string): boolean {
      const normalizedDir = normalizeVirtualPath(dirPath);
      if (normalizedDir === "") return true;
      const prefix = `${normalizedDir}/`;
      for (const filePath of normalizedFiles.keys()) {
        if (filePath.startsWith(prefix)) return true;
      }
      return path.resolve(dirPath) === libraryDirectory;
    },
  };
}
