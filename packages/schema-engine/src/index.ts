import { createHash } from "node:crypto";
import { schemaSnapshotSchema, type SchemaSnapshot } from "@codaryn/contracts";
import { extractSql } from "./sql.js";
import { extractPrisma } from "./prisma.js";
import { extractDrizzle } from "./drizzle.js";
import { identity, diagnostic, type Extraction } from "./model.js";
import { sourceLineage } from "./lineage.js";
import {
  resolveDrizzleReferences,
  inferNamingRelations,
  finalizeRelations,
} from "./relations.js";
export { compareSchemas } from "./compare.js";
export { renderSchemaSvg, renderSchemaMarkdown } from "./exports.js";
function inputs(files: Record<string, string>) {
  const entries = Object.entries(files).sort(([a], [b]) => a.localeCompare(b));
  if (
    entries.length > 10000 ||
    entries.reduce((sum, [, text]) => sum + Buffer.byteLength(text), 0) >
      50 * 1024 * 1024
  )
    throw new Error("Schema input limit exceeded");
  for (const [path, source] of entries) {
    if (
      path.startsWith("/") ||
      path.split("/").includes("..") ||
      path.includes("\\")
    )
      throw new Error("Unsafe source path");
    if (Buffer.byteLength(source) > 2 * 1024 * 1024)
      throw new Error("Schema file limit exceeded");
  }
  return entries;
}
function append(target: Extraction, result: Extraction) {
  target.tables.push(...result.tables);
  target.enums.push(...result.enums);
  target.relations.push(...result.relations);
  target.diagnostics.push(...result.diagnostics);
}
function deduplicateTables(snapshot: SchemaSnapshot) {
  const seen = new Set<string>(),
    ambiguous = new Set<string>();
  snapshot.tables = snapshot.tables.filter((item) => {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      return true;
    }
    ambiguous.add(item.id);
    snapshot.diagnostics.push({
      code: "AMBIGUOUS_TABLE",
      message:
        "Duplicate logical table declarations require source review; the first declaration is retained.",
      evidence: item.evidence,
    });
    return false;
  });
  for (const relation of snapshot.relations)
    if (ambiguous.has(relation.targetTableId ?? "")) {
      relation.targetTableId = null;
      relation.resolution = "UNRESOLVED";
    }
}
function capture(
  path: string,
  source: string,
  result: Extraction,
  bindings: Map<string, string>,
  columns: Map<string, string>,
) {
  try {
    if (path.endsWith(".prisma")) {
      append(result, extractPrisma(path, source));
      return;
    }
    if (!/\.[cm]?[jt]sx?$/.test(path) || !source.includes("drizzle-orm"))
      return;
    const drizzle = extractDrizzle(path, source);
    append(result, drizzle);
    for (const [key, value] of drizzle.bindings) {
      columns.set(key, value);
      if (!key.includes(":")) bindings.set(`${path}:${key}`, value);
    }
  } catch {
    diagnostic(
      result,
      path,
      source,
      0,
      "SCHEMA_PARSE",
      "Declaration could not be parsed safely.",
    );
  }
}
function canonical(snapshot: SchemaSnapshot) {
  snapshot.tables.sort((a, b) => a.id.localeCompare(b.id));
  snapshot.relations.sort((a, b) => a.id.localeCompare(b.id));
  snapshot.enums.sort((a, b) => a.id.localeCompare(b.id));
  snapshot.lineage.sort((a, b) => a.id.localeCompare(b.id));
  snapshot.diagnostics = [
    ...new Map(
      snapshot.diagnostics.map((item) => [JSON.stringify(item), item]),
    ).values(),
  ];
  return schemaSnapshotSchema.parse(snapshot);
}
export function extractSchema(
  files: Record<string, string>,
  inferRelations = false,
): { snapshot: SchemaSnapshot; hash: string } {
  const entries = inputs(files);
  const merged = extractSql(
    entries
      .filter(([path]) => path.endsWith(".sql"))
      .map(([path, content]) => ({ path, content })),
  );
  const bindings = new Map<string, string>(),
    columns = new Map<string, string>();
  for (const [path, source] of entries)
    capture(path, source, merged, bindings, columns);
  const snapshot: SchemaSnapshot = { version: 1, ...merged, lineage: [] };
  resolveDrizzleReferences(snapshot, bindings, columns);
  deduplicateTables(snapshot);
  if (inferRelations) inferNamingRelations(snapshot);
  finalizeRelations(snapshot);
  snapshot.lineage.push(...sourceLineage(files, snapshot.tables));
  for (const item of snapshot.tables)
    snapshot.lineage.push({
      id: identity(item.id, "orm-model"),
      kind: "orm-model",
      name: item.modelName,
      tableId: item.id,
      columnId: null,
      resolution: "DIRECT",
      evidence: item.evidence,
    });
  const parsed = canonical(snapshot);
  return {
    snapshot: parsed,
    hash: createHash("sha256").update(JSON.stringify(parsed)).digest("hex"),
  };
}
