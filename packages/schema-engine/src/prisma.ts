import {
  emptyExtraction,
  table,
  identity,
  evidence,
  diagnostic,
  type Extraction,
} from "./model.js";
import { matching, names, tokenize, type Token } from "./tokens.js";
function records(tokens: Token[], source: string) {
  const output: Token[][] = [];
  let current: Token[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (
      current.length &&
      depth === 0 &&
      source.slice(current[current.length - 1].end, token.start).includes("\n")
    ) {
      output.push(current);
      current = [];
    }
    current.push(token);
    if (["(", "["].includes(token.value)) depth++;
    if ([")", "]"].includes(token.value)) depth--;
  }
  if (current.length) output.push(current);
  return output;
}
function args(tokens: Token[], name: string) {
  const at = tokens.findIndex((token) => token.value === name);
  if (at < 0 || tokens[at + 1]?.value !== "(") return [];
  return tokens.slice(at + 2, matching(tokens, at + 1));
}
function arrayArg(tokens: Token[], key: string) {
  const at = tokens.findIndex(
    (token, index) => token.value === key && tokens[index + 1]?.value === ":",
  );
  if (at < 0 || tokens[at + 2]?.value !== "[") return [];
  return names(tokens.slice(at + 3, matching(tokens, at + 2, "[", "]")));
}
const scalars = new Set([
  "String",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "Boolean",
  "DateTime",
  "Json",
  "Bytes",
  "Unsupported",
]);
export function extractPrisma(path: string, source: string): Extraction {
  const result = emptyExtraction();
  const tokens = tokenize(source);
  const blocks: {
    kind: string;
    name: string;
    body: Token[];
    start: number;
    end: number;
  }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (
      !["model", "enum", "view"].includes(tokens[i].value) ||
      tokens[i + 2]?.value !== "{"
    )
      continue;
    const end = matching(tokens, i + 2, "{", "}");
    blocks.push({
      kind: tokens[i].value,
      name: tokens[i + 1].value,
      body: tokens.slice(i + 3, end),
      start: tokens[i].start,
      end: tokens[end].end,
    });
    i = end;
  }
  for (const block of blocks) {
    if (block.kind === "enum") {
      result.enums.push({
        id: identity("prisma", path, block.name),
        adapter: "prisma",
        name: block.name,
        values: records(block.body, source)
          .filter((row) => row[0].value !== "@")
          .map((row) => row[0].value),
        evidence: evidence(path, source, block.start, block.end),
      });
      continue;
    }
    if (block.kind === "view") {
      diagnostic(
        result,
        path,
        source,
        block.start,
        "PRISMA_VIEW",
        "Views are not materialized as tables.",
      );
      continue;
    }
    const rows = records(block.body, source);
    const map = rows.find(
      (row) =>
        row[0].value === "@" &&
        row[1]?.value === "@" &&
        row[2]?.value === "map",
    );
    const namespace = rows.find((row) => row[2]?.value === "schema");
    const target = table(
      "prisma",
      map ? (args(map, "map")[0]?.value ?? block.name) : block.name,
      path,
      source,
      block.start,
      block.end,
      namespace ? (args(namespace, "schema")[0]?.value ?? "public") : "public",
    );
    target.modelName = block.name;
    for (const row of rows) {
      if (row[0].value === "@") continue;
      const field = row[0];
      const type = row[1];
      if (!type) continue;
      if (
        !scalars.has(type.value) &&
        !blocks.some(
          (block) => block.kind === "enum" && block.name === type.value,
        )
      )
        continue;
      const mapped = args(row, "map")[0]?.value ?? field.value;
      const initial = args(row, "default");
      const nullable = row[2]?.value === "?";
      const primary = row.some((token) => token.value === "id");
      const unique = row.some((token) => token.value === "unique");
      target.columns.push({
        id: identity(target.id, mapped),
        name: mapped,
        type: type.value + (row[2]?.value === "[" ? "[]" : ""),
        nullable,
        primaryKey: primary,
        unique,
        defaultValue: initial.length
          ? source.slice(initial[0].start, initial[initial.length - 1].end)
          : null,
        evidence: evidence(path, source, field.start, row[row.length - 1].end),
      });
      for (const kind of [
        primary ? "primary-key" : null,
        unique ? "unique" : null,
      ] as const)
        if (kind)
          target.constraints.push({
            id: identity(target.id, kind, mapped),
            name: `${target.name}_${mapped}_${kind}`,
            kind,
            columns: [mapped],
            expression: null,
            evidence: target.columns[target.columns.length - 1].evidence,
          });
    }
    const fieldMap = (name: string) => {
      const row = rows.find((item) => item[0].value === name);
      return row ? (args(row, "map")[0]?.value ?? name) : name;
    };
    for (const row of rows.filter(
      (row) => row[0].value === "@" && row[1]?.value === "@",
    )) {
      const kind =
        row[2]?.value === "id"
          ? "primary-key"
          : row[2]?.value === "unique"
            ? "unique"
            : row[2]?.value === "index"
              ? "index"
              : null;
      if (!kind) continue;
      const input = args(row, row[2].value);
      const open = input.findIndex((token) => token.value === "[");
      const columns =
        open < 0
          ? []
          : names(input.slice(open + 1, matching(input, open, "[", "]"))).map(
              fieldMap,
            );
      const label = `${target.name}_${kind}_${columns.join("_")}`;
      target.constraints.push({
        id: identity(target.id, label),
        name: label,
        kind,
        columns,
        expression: null,
        evidence: evidence(path, source, row[0].start, row[row.length - 1].end),
      });
    }
    result.tables.push(target);
  }
  for (const block of blocks.filter((item) => item.kind === "model")) {
    const target = result.tables.find((item) => item.modelName === block.name);
    if (!target) continue;
    const rows = records(block.body, source);
    for (const row of rows) {
      const model = result.tables.find(
        (item) => item.modelName === row[1]?.value,
      );
      if (!model) continue;
      const input = args(row, "relation");
      const fieldNames = arrayArg(input, "fields");
      const refNames = arrayArg(input, "references");
      const mapped = (names: string[], body: Token[]) =>
        names.map((name) => {
          const field = records(body, source).find(
            (item) => item[0].value === name,
          );
          return field ? (args(field, "map")[0]?.value ?? name) : name;
        });
      const columns = mapped(fieldNames, block.body);
      const modelBlock = blocks.find((item) => item.name === model.modelName);
      const references = mapped(refNames, modelBlock?.body ?? []);
      const many =
        row[2]?.value === "[" &&
        modelBlock &&
        records(modelBlock.body, source).some(
          (other) => other[1]?.value === block.name && other[2]?.value === "[",
        );
      if (!columns.length && !many) continue;
      const name = `${target.name}.${row[0].value}`;
      const deletion = input.findIndex((token) => token.value === "onDelete");
      result.relations.push({
        id: identity(target.id, name),
        name,
        sourceTableId: target.id,
        targetTableId: model.id,
        targetName: model.name,
        columns,
        targetColumns: references,
        cardinality: many ? "many-to-many" : "one-to-many",
        resolution: "DIRECT",
        onDelete: deletion < 0 ? null : (input[deletion + 2]?.value ?? null),
        evidence: evidence(path, source, row[0].start, row[row.length - 1].end),
      });
      if (columns.length)
        target.constraints.push({
          id: identity(target.id, name, "fk"),
          name,
          kind: "foreign-key",
          columns,
          expression: null,
          evidence: result.relations[result.relations.length - 1].evidence,
        });
    }
  }
  return result;
}
