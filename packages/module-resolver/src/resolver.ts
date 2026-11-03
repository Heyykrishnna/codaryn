import path from "node:path";

export interface ModuleResolverOptions {
  readonly baseUrl?: string;
  readonly paths?: Record<string, string[]>;
  readonly packageRoots?: Record<string, string>;
}

export interface ModuleResolutionResult {
  readonly specifier: string;
  readonly resolvedPath: string | null;
  readonly isExternal: boolean;
  readonly packageName?: string;
}

const SUPPORTED_EXTENSIONS = [
  "",
  ".ts",
  ".tsx",
  ".d.ts",
  ".js",
  ".jsx",
  ".json",
  "/index.ts",
  "/index.tsx",
  "/index.d.ts",
  "/index.js",
  "/index.jsx",
] as const;

export function normalizePath(p: string): string {
  const normalized = path.posix.normalize(p.replace(/\\/g, "/"));
  return normalized.replace(/^\/+/, "").replace(/\/+$/, "");
}

function extractPackageName(specifier: string): string {
  const parts = specifier.split("/");
  if (specifier.startsWith("@") && parts.length >= 2) {
    return `${parts[0]}/${parts[1]}`;
  }
  return parts[0] ?? specifier;
}

function tryResolveCandidate(
  targetBasePath: string,
  filesSet: Set<string>,
): string | null {
  const cleanBase = normalizePath(targetBasePath);

  if (cleanBase.endsWith(".js")) {
    const tsEquivalent = cleanBase.slice(0, -3) + ".ts";
    if (filesSet.has(tsEquivalent)) return tsEquivalent;
    const tsxEquivalent = cleanBase.slice(0, -3) + ".tsx";
    if (filesSet.has(tsxEquivalent)) return tsxEquivalent;
  }

  for (const ext of SUPPORTED_EXTENSIONS) {
    const candidate = normalizePath(cleanBase + ext);
    if (filesSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolvePathAlias(
  specifier: string,
  options: ModuleResolverOptions,
  filesSet: Set<string>,
): string | null {
  if (!options.paths) return null;

  const baseUrl = options.baseUrl ? normalizePath(options.baseUrl) : "";

  for (const [pattern, replacements] of Object.entries(options.paths)) {
    const wildcardIndex = pattern.indexOf("*");
    if (wildcardIndex !== -1) {
      const prefix = pattern.slice(0, wildcardIndex);
      const suffix = pattern.slice(wildcardIndex + 1);

      if (specifier.startsWith(prefix) && specifier.endsWith(suffix)) {
        const matchedPortion = specifier.slice(
          prefix.length,
          specifier.length - suffix.length,
        );

        for (const replacement of replacements) {
          const targetSubst = replacement.replace("*", matchedPortion);
          const fullTarget = baseUrl
            ? path.posix.join(baseUrl, targetSubst)
            : targetSubst;
          const resolved = tryResolveCandidate(fullTarget, filesSet);
          if (resolved) return resolved;
        }
      }
    } else if (pattern === specifier) {
      for (const replacement of replacements) {
        const fullTarget = baseUrl
          ? path.posix.join(baseUrl, replacement)
          : replacement;
        const resolved = tryResolveCandidate(fullTarget, filesSet);
        if (resolved) return resolved;
      }
    }
  }

  return null;
}

export function resolveModule(
  specifier: string,
  containingFile: string,
  allFiles: Set<string> | readonly string[],
  options: ModuleResolverOptions = {},
): ModuleResolutionResult {
  const filesSet =
    allFiles instanceof Set ? allFiles : new Set(allFiles.map(normalizePath));
  const normalizedContaining = normalizePath(containingFile);
  const containingDir = path.posix.dirname(normalizedContaining);

  if (specifier.startsWith(".")) {
    const targetRelative = path.posix.join(containingDir, specifier);
    const resolved = tryResolveCandidate(targetRelative, filesSet);
    return {
      specifier,
      resolvedPath: resolved,
      isExternal: false,
    };
  }

  const aliasResolved = resolvePathAlias(specifier, options, filesSet);
  if (aliasResolved) {
    return {
      specifier,
      resolvedPath: aliasResolved,
      isExternal: false,
    };
  }

  if (options.packageRoots) {
    for (const [pkgName, pkgEntry] of Object.entries(options.packageRoots)) {
      if (specifier === pkgName) {
        const resolved = tryResolveCandidate(pkgEntry, filesSet);
        if (resolved) {
          return {
            specifier,
            resolvedPath: resolved,
            isExternal: false,
          };
        }
      } else if (specifier.startsWith(`${pkgName}/`)) {
        const subpath = specifier.slice(pkgName.length + 1);
        const pkgDir = path.posix.dirname(pkgEntry);
        const resolved = tryResolveCandidate(
          path.posix.join(pkgDir, subpath),
          filesSet,
        );
        if (resolved) {
          return {
            specifier,
            resolvedPath: resolved,
            isExternal: false,
          };
        }
      }
    }
  }

  if (options.baseUrl) {
    const baseUrlTarget = path.posix.join(options.baseUrl, specifier);
    const resolved = tryResolveCandidate(baseUrlTarget, filesSet);
    if (resolved) {
      return {
        specifier,
        resolvedPath: resolved,
        isExternal: false,
      };
    }
  }

  return {
    specifier,
    resolvedPath: null,
    isExternal: true,
    packageName: extractPackageName(specifier),
  };
}
