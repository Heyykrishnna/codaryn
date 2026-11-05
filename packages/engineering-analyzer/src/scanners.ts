import { z } from "zod";
import type { QualitySnapshot, QualityDependency } from "@codaryn/contracts";
import { resolveReportPath, finding, diagnostic, evidence } from "./model.js";
const semgrepRules = {
  "codaryn.dynamic-eval": {
    severity: "medium",
    title: "Semgrep dynamic evaluation pattern",
  },
  "codaryn.dynamic-shell": {
    severity: "high",
    title: "Semgrep shell execution pattern",
  },
  "codaryn.tls-disable": {
    severity: "high",
    title: "Semgrep disabled TLS verification pattern",
  },
} as const;
const semgrepSchema = z.object({
  results: z
    .array(
      z.object({
        check_id: z.string().max(500),
        path: z.string().max(4096),
        start: z.object({ line: z.number().int().positive() }),
        end: z.object({ line: z.number().int().positive() }),
      }),
    )
    .max(20000),
  errors: z.array(z.unknown()).max(10000).default([]),
  version: z.string().max(100).optional(),
});
function status(
  snapshot: QualitySnapshot,
  tool: "semgrep" | "osv",
  state: "completed" | "partial" | "failed",
  version: string,
  message: string,
) {
  const index = snapshot.scanners.findIndex((item) => item.tool === tool);
  snapshot.scanners[index] = {
    tool,
    status: state,
    version,
    message,
    checkedAt: new Date().toISOString(),
  };
}
export function importSemgrep(
  raw: unknown,
  files: Record<string, string>,
  snapshot: QualitySnapshot,
) {
  const report = semgrepSchema.parse(raw);
  let partial = report.errors.length > 0;
  for (const item of report.results) {
    const rule = (
        Object.keys(semgrepRules) as (keyof typeof semgrepRules)[]
      ).find(
        (rule) => item.check_id === rule || item.check_id.endsWith("." + rule),
      ),
      path = resolveReportPath(item.path, files);
    if (
      !rule ||
      !path ||
      item.end.line < item.start.line ||
      item.end.line > files[path].split("\n").length
    ) {
      partial = true;
      continue;
    }
    const policy = semgrepRules[rule];
    finding(snapshot, {
      ruleId: rule,
      tool: "semgrep",
      category: "dangerous-code",
      title: policy.title,
      description:
        "Trusted bundled Semgrep rule matched. Matched text, scanner messages and source excerpts are redacted.",
      severity: policy.severity,
      confidence: "medium",
      evidence: { path, startLine: item.start.line, endLine: item.end.line },
      dependencyId: null,
    });
  }
  status(
    snapshot,
    "semgrep",
    partial ? "partial" : "completed",
    report.version ?? "configured-cli",
    partial
      ? "Some scanner results were unsupported or incomplete; no clean result is asserted."
      : "Bundled local rules completed; findings are review candidates, not exploitability proofs.",
  );
}
const advisoryId = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,150}$/);
const osvReport = z.object({
  results: z
    .array(
      z.object({
        source: z.object({ path: z.string().max(4096) }),
        packages: z
          .array(
            z.object({
              package: z.object({
                name: z.string().max(256),
                version: z.string().max(160),
                ecosystem: z.string(),
              }),
              vulnerabilities: z
                .array(z.object({ id: advisoryId }))
                .max(20000)
                .default([]),
            }),
          )
          .max(20000),
      }),
    )
    .max(1000),
});
function advisory(
  snapshot: QualitySnapshot,
  dependency: QualityDependency,
  id: string,
) {
  finding(snapshot, {
    ruleId: `osv:${id}`,
    tool: "osv",
    category: "dependency",
    title: `Dependency advisory ${id}`,
    description:
      "Advisory matched a resolved lockfile package/version. Severity is unknown without a reviewed score; reachability and exploitability are not established.",
    severity: "unknown",
    confidence: "high",
    evidence: dependency.evidence,
    dependencyId: dependency.id,
  });
}
export function importOsv(
  raw: unknown,
  files: Record<string, string>,
  snapshot: QualitySnapshot,
) {
  const report = osvReport.parse(raw);
  let partial = false;
  const seen = new Set<string>();
  for (const group of report.results) {
    const path = resolveReportPath(group.source.path, files);
    for (const item of group.packages) {
      const matches = snapshot.dependencies.filter(
        (dep) =>
          dep.provenance === "resolved" &&
          dep.evidence.path === path &&
          dep.name === item.package.name &&
          dep.version === item.package.version &&
          item.package.ecosystem === "npm",
      );
      if (!matches.length) {
        partial = true;
        continue;
      }
      for (const dep of matches) seen.add(dep.id);
      for (const dep of matches)
        for (const vulnerability of item.vulnerabilities)
          advisory(snapshot, dep, vulnerability.id);
    }
  }
  if (
    snapshot.dependencies.some(
      (dep) => dep.provenance === "resolved" && !seen.has(dep.id),
    )
  )
    partial = true;
  status(
    snapshot,
    "osv",
    partial ? "partial" : "completed",
    "configured-cli",
    partial
      ? "Some scanner packages could not be matched to pinned resolved dependencies."
      : "OSV-Scanner results matched to resolved dependency evidence; declared ranges are not treated as installed versions.",
  );
}
async function boundedJson(response: Response) {
  if (!response.ok || !response.body)
    throw new Error("OSV response unavailable");
  const parts: Uint8Array[] = [];
  let bytes = 0,
    count = 0;
  for await (const part of response.body) {
    bytes += part.byteLength;
    count++;
    if (bytes > 2 * 1024 * 1024 || count > 4096)
      throw new Error("OSV response limit");
    parts.push(part);
  }
  const data: unknown = JSON.parse(Buffer.concat(parts).toString("utf8"));
  return data;
}
export async function lookupOsv(
  snapshot: QualitySnapshot,
  request: typeof fetch = fetch,
) {
  const resolved = snapshot.dependencies.filter(
    (dep) =>
      dep.provenance === "resolved" &&
      /^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(dep.name) &&
      /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/.test(
        dep.version,
      ),
  );
  const targets = [
    ...new Map(
      resolved.map((dep) => [`${dep.name}@${dep.version}`, dep]),
    ).values(),
  ].slice(0, 100);
  if (!targets.length) {
    status(
      snapshot,
      "osv",
      "completed",
      "api-v1",
      "No supported resolved dependencies were available to query; declared ranges and redacted identifiers were not scanned.",
    );
    return;
  }
  try {
    const response = await request("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        queries: targets.map((dep) => ({
          package: { ecosystem: "npm", name: dep.name },
          version: dep.version,
        })),
      }),
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    const payload = z
      .object({
        results: z
          .array(
            z.object({
              vulns: z
                .array(z.object({ id: advisoryId }))
                .max(10000)
                .default([]),
              next_page_token: z.string().optional(),
            }),
          )
          .max(100),
      })
      .parse(await boundedJson(response));
    if (payload.results.length !== targets.length)
      throw new Error("OSV result mismatch");
    let partial =
      new Set(resolved.map((dep) => `${dep.name}@${dep.version}`)).size > 100 ||
      snapshot.dependencies.filter((dep) => dep.provenance === "resolved")
        .length > resolved.length;
    payload.results.forEach((row, index) => {
      if (row.next_page_token) partial = true;
      for (const dep of resolved.filter(
        (dep) =>
          dep.name === targets[index].name &&
          dep.version === targets[index].version,
      ))
        for (const vuln of row.vulns) advisory(snapshot, dep, vuln.id);
    });
    status(
      snapshot,
      "osv",
      partial ? "partial" : "completed",
      "api-v1",
      partial
        ? "Dependency query or pagination limit reached; unqueried dependencies are not clean."
        : "Resolved package versions queried against OSV. Declared ranges are not installed-version evidence.",
    );
  } catch {
    status(
      snapshot,
      "osv",
      "failed",
      "api-v1",
      "OSV lookup failed or returned unsupported data; vulnerability absence cannot be asserted.",
    );
  }
}
