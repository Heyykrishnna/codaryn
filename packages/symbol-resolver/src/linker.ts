import crypto from "node:crypto";
import type {
  ClassSymbol,
  FunctionSymbol,
  ImportExportSymbol,
  InterfaceSymbol,
  ResolvedSymbolReference,
  SourceEvidence,
  TypeAliasSymbol,
} from "@codaryn/contracts";
import {
  resolveModule,
  type ModuleResolverOptions,
} from "@codaryn/module-resolver";

export interface FileSymbolInventory {
  readonly path: string;
  readonly functions: readonly FunctionSymbol[];
  readonly classes: readonly ClassSymbol[];
  readonly interfaces: readonly InterfaceSymbol[];
  readonly types: readonly TypeAliasSymbol[];
  readonly importsExports: readonly ImportExportSymbol[];
}

interface ReExportInfo {
  readonly moduleSpecifier: string;
  readonly specifiers: readonly { name: string; alias?: string }[];
  readonly isStar: boolean;
}

interface FileSymbolIndex {
  readonly symbolMap: Map<string, string>;
  readonly defaultSymbolId: string | null;
  readonly reExports: readonly ReExportInfo[];
}

export function generateReferenceId(
  sourceFile: string,
  moduleSpecifier: string,
  symbolName: string,
  startLine: number,
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${sourceFile}:${moduleSpecifier}:${symbolName}:${startLine}`)
    .digest("hex");
  return `ref:${hash.slice(0, 16)}`;
}

export class SymbolLinker {
  private readonly fileIndices = new Map<string, FileSymbolIndex>();
  private readonly allFilePaths: Set<string>;

  constructor(
    inventories: readonly FileSymbolInventory[],
    private readonly options: ModuleResolverOptions = {},
  ) {
    this.allFilePaths = new Set(inventories.map((inv) => inv.path));

    for (const inv of inventories) {
      const symbolMap = new Map<string, string>();
      let defaultSymbolId: string | null = null;
      const reExports: ReExportInfo[] = [];

      for (const fn of inv.functions) {
        symbolMap.set(fn.name, fn.id);
        if (fn.modifiers.includes("default")) {
          defaultSymbolId = fn.id;
        }
      }

      for (const cls of inv.classes) {
        symbolMap.set(cls.name, cls.id);
        if (cls.modifiers.includes("default")) {
          defaultSymbolId = cls.id;
        }
      }

      for (const iface of inv.interfaces) {
        symbolMap.set(iface.name, iface.id);
      }

      for (const type of inv.types) {
        symbolMap.set(type.name, type.id);
      }

      for (const ie of inv.importsExports) {
        if (ie.kind === "export" && ie.moduleSpecifier) {
          reExports.push({
            moduleSpecifier: ie.moduleSpecifier,
            specifiers: ie.specifiers,
            isStar: ie.isNamespace || ie.specifiers.length === 0,
          });
        }
        if (ie.kind === "export" && ie.isDefault && !defaultSymbolId) {
          defaultSymbolId = ie.id;
        }
      }

      this.fileIndices.set(inv.path, {
        symbolMap,
        defaultSymbolId,
        reExports,
      });
    }
  }

  public resolveAllReferences(
    inventories: readonly FileSymbolInventory[],
  ): ResolvedSymbolReference[] {
    const references: ResolvedSymbolReference[] = [];

    for (const inv of inventories) {
      for (const ie of inv.importsExports) {
        if (ie.kind !== "import" || !ie.moduleSpecifier) continue;

        const evidence: SourceEvidence = {
          path: inv.path,
          startLine: ie.location.startLine,
          endLine: ie.location.endLine,
        };

        const resolution = resolveModule(
          ie.moduleSpecifier,
          inv.path,
          this.allFilePaths,
          this.options,
        );

        if (resolution.isExternal) {
          if (ie.specifiers.length > 0) {
            for (const s of ie.specifiers) {
              references.push({
                id: generateReferenceId(
                  inv.path,
                  ie.moduleSpecifier,
                  s.name,
                  ie.location.startLine,
                ),
                sourceFile: inv.path,
                sourceSymbolName: s.name,
                localAlias: s.alias,
                moduleSpecifier: ie.moduleSpecifier,
                targetFile: null,
                targetSymbolId: null,
                status: "external",
                evidence,
              });
            }
          } else {
            references.push({
              id: generateReferenceId(
                inv.path,
                ie.moduleSpecifier,
                "*",
                ie.location.startLine,
              ),
              sourceFile: inv.path,
              sourceSymbolName: ie.isDefault ? "default" : "*",
              moduleSpecifier: ie.moduleSpecifier,
              targetFile: null,
              targetSymbolId: null,
              status: "external",
              evidence,
            });
          }
          continue;
        }

        if (!resolution.resolvedPath) {
          if (ie.specifiers.length > 0) {
            for (const s of ie.specifiers) {
              references.push({
                id: generateReferenceId(
                  inv.path,
                  ie.moduleSpecifier,
                  s.name,
                  ie.location.startLine,
                ),
                sourceFile: inv.path,
                sourceSymbolName: s.name,
                localAlias: s.alias,
                moduleSpecifier: ie.moduleSpecifier,
                targetFile: null,
                targetSymbolId: null,
                status: "unresolved",
                evidence,
              });
            }
          } else {
            references.push({
              id: generateReferenceId(
                inv.path,
                ie.moduleSpecifier,
                ie.isDefault ? "default" : "*",
                ie.location.startLine,
              ),
              sourceFile: inv.path,
              sourceSymbolName: ie.isDefault ? "default" : "*",
              moduleSpecifier: ie.moduleSpecifier,
              targetFile: null,
              targetSymbolId: null,
              status: "unresolved",
              evidence,
            });
          }
          continue;
        }

        const targetFile = resolution.resolvedPath;

        if (ie.isNamespace) {
          references.push({
            id: generateReferenceId(
              inv.path,
              ie.moduleSpecifier,
              "*",
              ie.location.startLine,
            ),
            sourceFile: inv.path,
            sourceSymbolName: "*",
            moduleSpecifier: ie.moduleSpecifier,
            targetFile,
            targetSymbolId: null,
            status: "resolved",
            evidence,
          });
          continue;
        }

        if (ie.isDefault) {
          const defaultTarget = this.findDefaultSymbol(targetFile, new Set());
          references.push({
            id: generateReferenceId(
              inv.path,
              ie.moduleSpecifier,
              "default",
              ie.location.startLine,
            ),
            sourceFile: inv.path,
            sourceSymbolName: "default",
            localAlias: ie.specifiers[0]?.name,
            moduleSpecifier: ie.moduleSpecifier,
            targetFile,
            targetSymbolId: defaultTarget,
            status: defaultTarget ? "resolved" : "unresolved",
            evidence,
          });
          continue;
        }

        for (const s of ie.specifiers) {
          const targetSymbolId = this.findNamedSymbol(
            targetFile,
            s.name,
            new Set(),
          );
          references.push({
            id: generateReferenceId(
              inv.path,
              ie.moduleSpecifier,
              s.name,
              ie.location.startLine,
            ),
            sourceFile: inv.path,
            sourceSymbolName: s.name,
            localAlias: s.alias,
            moduleSpecifier: ie.moduleSpecifier,
            targetFile,
            targetSymbolId,
            status: targetSymbolId ? "resolved" : "unresolved",
            evidence,
          });
        }
      }
    }

    return references;
  }

  private findDefaultSymbol(
    targetFile: string,
    visited: Set<string>,
  ): string | null {
    if (visited.has(targetFile)) return null;
    visited.add(targetFile);

    const index = this.fileIndices.get(targetFile);
    if (!index) return null;

    if (index.defaultSymbolId) {
      return index.defaultSymbolId;
    }

    const firstSymbol = index.symbolMap.values().next().value;
    if (firstSymbol) {
      return firstSymbol;
    }

    for (const rx of index.reExports) {
      const res = resolveModule(
        rx.moduleSpecifier,
        targetFile,
        this.allFilePaths,
        this.options,
      );
      if (res.resolvedPath) {
        const nested = this.findDefaultSymbol(res.resolvedPath, visited);
        if (nested) return nested;
      }
    }

    return null;
  }

  private findNamedSymbol(
    targetFile: string,
    symbolName: string,
    visited: Set<string>,
  ): string | null {
    if (visited.has(targetFile)) return null;
    visited.add(targetFile);

    const index = this.fileIndices.get(targetFile);
    if (!index) return null;

    const direct = index.symbolMap.get(symbolName);
    if (direct) return direct;

    for (const rx of index.reExports) {
      const res = resolveModule(
        rx.moduleSpecifier,
        targetFile,
        this.allFilePaths,
        this.options,
      );
      if (!res.resolvedPath) continue;

      if (rx.isStar) {
        const nested = this.findNamedSymbol(
          res.resolvedPath,
          symbolName,
          visited,
        );
        if (nested) return nested;
      } else {
        const matchingSpec = rx.specifiers.find(
          (s) => (s.alias ?? s.name) === symbolName,
        );
        if (matchingSpec) {
          const nested = this.findNamedSymbol(
            res.resolvedPath,
            matchingSpec.name,
            visited,
          );
          if (nested) return nested;
        }
      }
    }

    return null;
  }
}
