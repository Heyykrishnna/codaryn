import {
  comparisonResultSchema,
  type VersionSnapshot,
  type ComparisonResult,
} from "@codaryn/contracts";
import { digest } from "./file.js";
export class ComparisonLimitError extends Error {}
export function compareVersions(
  before: VersionSnapshot,
  after: VersionSnapshot,
): ComparisonResult {
  const changes: ComparisonResult["changes"] = [];
  type ObjectItem = {
    summary: string;
    id: string;
    name: string;
    hash: string;
    evidence: { path: string; startLine: number; endLine: number };
    kind: ComparisonResult["changes"][number]["object"];
  };
  const objects = (snapshot: VersionSnapshot): ObjectItem[] => [
    ...snapshot.files.map((file) => ({
      summary: `${file.path} · ${file.hash.slice(0, 12)}`,
      id: digest(["file", file.path]),
      name: file.path,
      hash: file.hash,
      kind: "file" as const,
      evidence: { path: file.path, startLine: 1, endLine: 1 },
    })),
    ...snapshot.files.flatMap((file) =>
      file.symbols.map((symbol) => ({
        ...symbol,
        summary: `${symbol.kind} ${symbol.name} · ${symbol.hash.slice(0, 12)}`,
        kind: "symbol" as const,
      })),
    ),
    ...snapshot.edges.map((edge) => ({
      summary: `${edge.source} → ${edge.target ?? edge.specifier} (${edge.resolution})`,
      id: edge.id,
      name: `${edge.source} → ${edge.specifier}`.slice(0, 1024),
      hash: digest([edge.target, edge.resolution]),
      kind: "relationship" as const,
      evidence: edge.evidence,
    })),
    ...snapshot.schema.map((item) => ({
      ...item,
      summary: `${item.kind} ${item.name} · ${item.hash.slice(0, 12)}`,
    })),
  ];
  const from = new Map(objects(before).map((item) => [item.id, item])),
    to = new Map(objects(after).map((item) => [item.id, item]));
  for (const id of [...new Set([...from.keys(), ...to.keys()])].sort()) {
    const old = from.get(id),
      next = to.get(id);
    if (old?.hash === next?.hash) continue;
    const item = next ?? old;
    if (!item) continue;
    changes.push({
      id,
      kind: !old ? "added" : !next ? "removed" : "changed",
      object: item.kind,
      name: item.name,
      beforeSummary: old?.summary.slice(0, 1024) ?? null,
      afterSummary: next?.summary.slice(0, 1024) ?? null,
      before: old?.hash ?? null,
      after: next?.hash ?? null,
      evidence: item.evidence,
    });
    if (changes.length > 50000)
      throw new ComparisonLimitError("Comparison result limit exceeded");
  }
  const reverse = new Map<string, Set<string>>();
  for (const edge of [...before.edges, ...after.edges])
    if (edge.target) {
      const set = reverse.get(edge.target) ?? new Set<string>();
      set.add(edge.source);
      reverse.set(edge.target, set);
    }
  const changed = [
      ...new Set(
        changes
          .filter(
            (item) => item.object === "file" || item.object === "relationship",
          )
          .map((item) => item.evidence.path),
      ),
    ].sort(),
    impact: ComparisonResult["impact"] = [],
    seen = new Set<string>(changed.slice(0, 10000));
  for (const path of changed.slice(0, 10000))
    impact.push({ path, depth: 0, reason: "changed", via: null });
  let truncated = changed.length > 10000;
  for (let i = 0; i < impact.length; i++) {
    const item = impact[i],
      neighbors = [...(reverse.get(item.path) ?? [])].sort();
    for (const path of neighbors) {
      if (seen.has(path)) continue;
      if (impact.length >= 10000 || item.depth >= 30) {
        truncated = true;
        continue;
      }
      seen.add(path);
      impact.push({
        path,
        depth: item.depth + 1,
        reason: "dependent",
        via: item.path,
      });
    }
  }
  const drift: ComparisonResult["drift"] = [];
  if (
    changes.some((item) => item.object === "symbol" && item.kind === "removed")
  )
    drift.push("removed-symbols");
  if (
    changes.some(
      (item) =>
        ["table", "column", "constraint", "relation", "enum"].includes(
          item.object,
        ) && item.kind === "removed",
    )
  )
    drift.push("removed-schema-objects");
  if (
    after.edges.filter((edge) => edge.resolution === "unresolved").length >
    before.edges.filter((edge) => edge.resolution === "unresolved").length
  )
    drift.push("new-unresolved-imports");
  if (before.compatibility !== after.compatibility)
    drift.push("configuration-changed");
  return comparisonResultSchema.parse({
    version: 1,
    changes,
    impact,
    truncated,
    drift,
    semantics: "potential-static",
  });
}
