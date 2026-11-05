import { createHash } from "node:crypto";
import {
  qualitySnapshotSchema,
  type QualitySnapshot,
} from "@codaryn/contracts";
import { inputs, emptySnapshot, diagnostic, bounds } from "./model.js";
import {
  extractDocker,
  extractCompose,
  extractWorkflow,
} from "./infrastructure.js";
import { extractSecurity, extractEnvironment } from "./security.js";
import { extractDependencies } from "./dependencies.js";
import { extractTests, extractLcov, extractIstanbul } from "./testing.js";
export { safeLabel, resolveReportPath } from "./model.js";
export { importSemgrep, importOsv, lookupOsv } from "./scanners.js";
export function canonicalQuality(snapshot: QualitySnapshot) {
  const normalize = <T extends { id: string }>(list: T[]) =>
    [...new Map(list.map((item) => [item.id, item])).values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
  snapshot.resources = normalize(snapshot.resources);
  snapshot.relations = normalize(snapshot.relations);
  snapshot.environment = normalize(snapshot.environment);
  snapshot.tests = normalize(snapshot.tests);
  snapshot.testLinks = normalize(snapshot.testLinks);
  snapshot.coverage = normalize(snapshot.coverage);
  snapshot.dependencies = normalize(snapshot.dependencies);
  snapshot.findings = normalize(snapshot.findings);
  snapshot.diagnostics = [
    ...new Map(
      snapshot.diagnostics.map((item) => [JSON.stringify(item), item]),
    ).values(),
  ];
  bounds(snapshot);
  const parsed = qualitySnapshotSchema.parse(snapshot);
  return {
    snapshot: parsed,
    hash: createHash("sha256").update(JSON.stringify(parsed)).digest("hex"),
  };
}
export function extractQuality(files: Record<string, string>) {
  const entries = inputs(files),
    result = emptySnapshot(),
    redactions = new Set<string>();
  for (const [path, source] of entries) {
    extractSecurity(path, source, result, redactions);
    extractEnvironment(path, source, result);
    try {
      if (/(^|\/)Dockerfile(?:\.|$)/.test(path))
        extractDocker(path, source, result);
      else if (/(?:^|\/)(?:docker-)?compose[^/]*\.ya?ml$/.test(path))
        extractCompose(path, source, result);
      else if (path.startsWith(".github/workflows/") && /\.ya?ml$/.test(path))
        extractWorkflow(path, source, result);
      if (
        path.endsWith("package.json") ||
        path.endsWith("package-lock.json") ||
        path.endsWith("pnpm-lock.yaml")
      )
        extractDependencies(path, source, result);
      if (path.endsWith("lcov.info") || path.endsWith(".lcov"))
        extractLcov(path, source, files, result);
      else if (path.endsWith("coverage-final.json"))
        extractIstanbul(path, source, files, result);
    } catch {
      diagnostic(
        result,
        path,
        source,
        "CONFIGURATION_PARTIAL",
        "Unsupported or malformed configuration/report was not interpreted; values and parser errors are redacted.",
      );
    }
  }
  extractTests(files, result);
  if (result.diagnostics.length)
    result.scanners[0] = {
      ...result.scanners[0],
      status: "partial",
      message:
        "Supported rules ran with analysis boundaries or malformed inputs; no comprehensive clean result is asserted.",
    };
  const values = [...redactions]
    .filter((value) => value.length >= 8)
    .map((value) => value.slice(0, 512))
    .sort((a, b) => b.length - a.length);
  if (values.length > 256) throw new Error("Sensitive-value limit exceeded");
  const sanitized: unknown = JSON.parse(
    JSON.stringify(result, (_key, value: unknown) => {
      if (typeof value !== "string") return value;
      let output = value;
      for (const secret of values)
        output = output.replaceAll(secret, "[REDACTED]");
      return output;
    }),
  );
  return canonicalQuality(qualitySnapshotSchema.parse(sanitized));
}
