import path from "node:path";
import ts from "typescript";
import type { TsconfigInfo } from "@codaryn/contracts";
import {
  createVirtualCompilerHost,
  normalizeVirtualPath,
  type VirtualFileSystem,
} from "./host.js";

export function parseTsconfig(
  configPath: string,
  content: string,
  files: VirtualFileSystem,
): TsconfigInfo {
  const normalizedPath = normalizeVirtualPath(configPath);
  const basePath = path.posix.dirname(normalizedPath);

  const parsedJson = ts.parseConfigFileTextToJson(normalizedPath, content);
  const rawConfig = parsedJson.config ?? {};

  const host = createVirtualCompilerHost(files);
  const parsed = ts.parseJsonConfigFileContent(
    rawConfig,
    {
      useCaseSensitiveFileNames: true,
      readDirectory: (dir, extensions, excludes, includes, depth) => {
        const normDir = normalizeVirtualPath(dir);
        const prefix = normDir === "" ? "" : `${normDir}/`;
        const matched: string[] = [];

        for (const filePath of files.keys()) {
          const normFile = normalizeVirtualPath(filePath);
          if (prefix === "" || normFile.startsWith(prefix)) {
            const ext = path.posix.extname(normFile);
            if (extensions.includes(ext)) {
              matched.push(normFile);
            }
          }
        }
        return matched;
      },
      fileExists: (fileName) => host.fileExists(fileName),
      readFile: (fileName) => host.readFile(fileName),
      trace: () => {},
    },
    basePath,
  );

  const projectReferences = (rawConfig.references ?? []).map(
    (ref: { path: string }) => {
      const resolved = path.posix.join(basePath, ref.path);
      return normalizeVirtualPath(resolved);
    },
  );

  return {
    path: normalizedPath,
    compilerOptions: (rawConfig.compilerOptions ?? {}) as Record<
      string,
      unknown
    >,
    projectReferences,
    include: Array.isArray(rawConfig.include) ? rawConfig.include : [],
    exclude: Array.isArray(rawConfig.exclude) ? rawConfig.exclude : [],
    sourceFileCount: parsed.fileNames.length,
  };
}

export function discoverTsconfigs(files: VirtualFileSystem): TsconfigInfo[] {
  const configs: TsconfigInfo[] = [];

  for (const [filePath, content] of files.entries()) {
    const normalized = normalizeVirtualPath(filePath);
    const basename = path.posix.basename(normalized);
    if (
      basename === "tsconfig.json" ||
      (basename.startsWith("tsconfig.") && basename.endsWith(".json"))
    ) {
      try {
        const info = parseTsconfig(normalized, content, files);
        configs.push(info);
      } catch {
        configs.push({
          path: normalized,
          compilerOptions: {},
          projectReferences: [],
          include: [],
          exclude: [],
          sourceFileCount: 0,
        });
      }
    }
  }

  return configs.sort((a, b) => a.path.localeCompare(b.path));
}
