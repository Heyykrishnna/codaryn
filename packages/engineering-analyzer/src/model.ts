import { createHash } from "node:crypto";
import { parseDocument } from "yaml";
import { z } from "zod";
import type {
  QualitySnapshot,
  QualityFinding,
  SourceEvidence,
} from "@codaryn/contracts";
export const object = (value: unknown): Record<string, unknown> =>
  z.record(z.string(), z.unknown()).catch({}).parse(value);
export const array = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];
export const strings = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : array(value).filter((item): item is string => typeof item === "string");
export const text = (value: unknown) =>
  typeof value === "string" ? value : "";
export function identity(...parts: (string | number)[]) {
  return createHash("sha256").update(parts.join("\0")).digest("hex");
}
export function safeLabel(value: string) {
  const key = value.search(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
  const visible =
    key >= 0 ? value.slice(0, key) + "[REDACTED PRIVATE KEY]" : value;
  return visible
    .replaceAll(/\b(?:ghp_|github_pat_|npg_)[A-Za-z0-9_]{12,}\b/g, "[REDACTED]")
    .replaceAll(/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g, "[REDACTED]")
    .replaceAll(
      /([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^/\s@]+@/gi,
      "$1[REDACTED]@",
    )
    .replaceAll(
      /\b(password|secret|token|api[_-]?key)\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi,
      "$1=[REDACTED]",
    )
    .slice(0, 512);
}
export function evidence(
  path: string,
  source: string,
  start = 0,
  end = source.length,
): SourceEvidence {
  return {
    path,
    startLine: source.slice(0, start).split("\n").length,
    endLine: source.slice(0, end).split("\n").length,
  };
}
export function diagnostic(
  result: QualitySnapshot,
  path: string,
  source: string,
  code: string,
  message: string,
) {
  result.diagnostics.push({ code, message, evidence: evidence(path, source) });
  bounds(result);
}
export function finding(
  result: QualitySnapshot,
  input: Omit<QualityFinding, "id">,
) {
  result.findings.push({
    ...input,
    id: identity(
      input.ruleId,
      input.evidence.path,
      input.evidence.startLine,
      input.dependencyId ?? "",
    ),
  });
  bounds(result);
}
export function configuration(source: string): Record<string, unknown> {
  const doc = parseDocument(source, {
    uniqueKeys: true,
    stringKeys: true,
    version: "1.2",
    schema: "core",
    prettyErrors: false,
    merge: true,
  });
  if (doc.errors.length || doc.warnings.length)
    throw new Error("Configuration parse incomplete");
  const data: unknown = doc.toJS({ maxAliasCount: 20 });
  return object(data);
}
export function bounds(s: QualitySnapshot) {
  if (
    s.resources.length > 10000 ||
    s.relations.length > 20000 ||
    s.environment.length > 10000 ||
    s.tests.length > 10000 ||
    s.testLinks.length > 30000 ||
    s.coverage.length > 10000 ||
    s.dependencies.length > 20000 ||
    s.findings.length > 20000 ||
    s.diagnostics.length > 10000
  )
    throw new Error("Engineering object limit exceeded");
}
export function inputs(files: Record<string, string>) {
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  if (
    entries.length > 10000 ||
    entries.reduce((n, [, s]) => n + Buffer.byteLength(s), 0) > 50 * 1024 * 1024
  )
    throw new Error("Engineering input limit exceeded");
  for (const [path, s] of entries)
    if (
      path.length > 1024 ||
      path.startsWith("/") ||
      path.includes("\\") ||
      path.includes("\0") ||
      path.split("/").includes("..") ||
      Buffer.byteLength(s) > 2 * 1024 * 1024
    )
      throw new Error("Unsafe or oversized engineering source");
  return entries;
}
export function emptySnapshot(): QualitySnapshot {
  return {
    version: 1,
    resources: [],
    relations: [],
    environment: [],
    tests: [],
    testLinks: [],
    coverage: [],
    dependencies: [],
    findings: [],
    scanners: [
      {
        tool: "builtin",
        status: "completed",
        message:
          "Supported static rules ran; this is not proof of security or runtime correctness.",
        checkedAt: null,
        version: "rules-v1",
      },
      {
        tool: "semgrep",
        status: "unavailable",
        message: "Semgrep CLI is not configured.",
        checkedAt: null,
        version: "unconfigured",
      },
      {
        tool: "osv",
        status: "disabled",
        message:
          "External dependency lookup requires explicit authorization and server policy.",
        checkedAt: null,
        version: "api-v1",
      },
    ],
    diagnostics: [],
  };
}
export function resolveReportPath(raw: string, files: Record<string, string>) {
  const normalized = raw.replaceAll("\\", "/").replace(/^\.\//, "");
  if (Object.hasOwn(files, normalized)) return normalized;
  const candidates = Object.keys(files).filter((path) =>
    normalized.endsWith("/" + path),
  );
  return candidates.length === 1 ? candidates[0] : undefined;
}
