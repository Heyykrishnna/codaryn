import { createHash } from "node:crypto";
import ts from "typescript";
import type { VersionFile } from "@codaryn/contracts";
export const digest = (value: unknown) =>
  createHash("sha256")
    .update(
      typeof value === "string"
        ? value
        : JSON.stringify(value, (_key, item: unknown) =>
            typeof item === "object" && item !== null && !Array.isArray(item)
              ? Object.fromEntries(
                  Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
                )
              : item,
          ),
    )
    .digest("hex");
export function label(value: string) {
  return value
    .replace(/\b(?:ghp_|github_pat_|npg_)[A-Za-z0-9_]{12,}\b/g, "[REDACTED]")
    .slice(0, 256);
}
export function analyzeFile(path: string, source: string): VersionFile {
  const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true),
    symbols: VersionFile["symbols"] = [],
    imports: VersionFile["imports"] = [],
    diagnostics: string[] = [];
  const evidence = (node: ts.Node) => ({
    path,
    startLine: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
    endLine: sf.getLineAndCharacterOfPosition(node.end).line + 1,
  });
  function visit(node: ts.Node) {
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node) ||
        ts.isMethodDeclaration(node) ||
        ts.isVariableDeclaration(node)) &&
      node.name
    ) {
      const name = label(node.name.getText(sf));
      symbols.push({
        id: digest([path, node.kind, name, evidence(node).startLine]),
        name,
        kind: ts.SyntaxKind[node.kind],
        hash: digest(node.getText(sf)),
        evidence: evidence(node),
      });
    }
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const raw = node.moduleSpecifier.text,
        specifier = /^[\w@./#-]{1,512}$/.test(raw)
          ? label(raw)
          : "[unsupported import]";
      imports.push({ specifier, evidence: evidence(node) });
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    )
      diagnostics.push("DYNAMIC_IMPORT");
    ts.forEachChild(node, visit);
  }
  if (/\.[cm]?[jt]sx?$/.test(path)) visit(sf);
  if (symbols.length > 10000 || imports.length > 10000)
    throw new Error("Version file limit exceeded");
  const artifact = {
    path,
    hash: digest(source),
    symbols,
    imports,
    diagnostics: [...new Set(diagnostics)].sort(),
  };
  return { ...artifact, artifactHash: digest(artifact) };
}
export function validArtifact(file: VersionFile) {
  const { artifactHash, ...artifact } = file;
  return digest(artifact) === artifactHash;
}
export function sourceInputs(files: Record<string, string>) {
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  if (
    entries.length > 10000 ||
    entries.reduce((n, [, s]) => n + Buffer.byteLength(s), 0) > 50 * 1024 * 1024
  )
    throw new Error("Version input limit exceeded");
  for (const [path, source] of entries)
    if (
      !path ||
      path.length > 1024 ||
      path.startsWith("/") ||
      path.includes("\\") ||
      path.includes("\0") ||
      path.split("/").includes("..") ||
      label(path) !== path ||
      Buffer.byteLength(source) > 2 * 1024 * 1024
    )
      throw new Error("Unsafe version source");
  return entries;
}
