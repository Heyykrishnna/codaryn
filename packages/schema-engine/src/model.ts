import { createHash } from "node:crypto";
import type {
  SchemaAdapter,
  SchemaSnapshot,
  SchemaTable,
  SourceEvidence,
} from "@codaryn/contracts";
export type Extraction = Pick<
  SchemaSnapshot,
  "tables" | "relations" | "enums" | "diagnostics"
>;
export const emptyExtraction = (): Extraction => ({
  tables: [],
  relations: [],
  enums: [],
  diagnostics: [],
});
export function identity(...parts: string[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}
export function tableId(
  adapter: SchemaAdapter,
  namespace: string,
  name: string,
) {
  return `${adapter}:${namespace}.${name}`;
}
export function evidence(
  path: string,
  source: string,
  start: number,
  end: number,
): SourceEvidence {
  return {
    path,
    startLine: source.slice(0, start).split("\n").length,
    endLine: source.slice(0, end).split("\n").length,
  };
}
export function table(
  adapter: SchemaAdapter,
  name: string,
  path: string,
  source: string,
  start: number,
  end: number,
  namespace = "public",
): SchemaTable {
  return {
    id: tableId(adapter, namespace, name),
    adapter,
    name,
    namespace,
    modelName: name,
    domain: path.includes("/")
      ? path.split("/").slice(0, -1).join("/")
      : namespace,
    joinTable: false,
    columns: [],
    constraints: [],
    evidence: evidence(path, source, start, end),
    source: source.slice(start, end).slice(0, 16000),
  };
}
export function diagnostic(
  result: Extraction,
  path: string,
  source: string,
  start: number,
  code: string,
  message: string,
) {
  if (result.diagnostics.length < 5000)
    result.diagnostics.push({
      code,
      message,
      evidence: evidence(path, source, start, start),
    });
}
