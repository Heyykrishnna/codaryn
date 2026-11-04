import type { SchemaTable } from "@codaryn/contracts";
import {
  emptyExtraction,
  table,
  identity,
  evidence,
  diagnostic,
  type Extraction,
} from "./model.js";
import { matching, names, tokenize, type Token } from "./tokens.js";
type Block = {
  kind: string;
  name: string;
  body: Token[];
  start: number;
  end: number;
};
const scalarTypes = new Set([
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
function readBlocks(tokens: Token[]): Block[] {
  const blocks: Block[] = [];
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
  return blocks;
}
const constraintKinds: Record<string, "primary-key" | "unique" | "index"> = {
  id: "primary-key",
  unique: "unique",
  index: "index",
};
class PrismaParser {
  private readonly result = emptyExtraction();
  private readonly blocks: Block[];
  constructor(
    private readonly path: string,
    private readonly source: string,
  ) {
    this.blocks = readBlocks(tokenize(source));
  }
  read() {
    for (const block of this.blocks) this.declaration(block);
    for (const block of this.blocks.filter((item) => item.kind === "model")) {
      const target = this.result.tables.find(
        (item) => item.modelName === block.name,
      );
      if (!target) continue;
      for (const row of records(block.body, this.source))
        this.relation(block, target, row);
    }
    return this.result;
  }
  private location(tokens: Token[]) {
    return evidence(
      this.path,
      this.source,
      tokens[0].start,
      tokens[tokens.length - 1].end,
    );
  }
  private declaration(block: Block) {
    if (block.kind === "enum") {
      this.result.enums.push({
        id: identity("prisma", this.path, block.name),
        adapter: "prisma",
        name: block.name,
        values: records(block.body, this.source)
          .filter((row) => row[0].value !== "@")
          .map((row) => row[0].value),
        evidence: evidence(this.path, this.source, block.start, block.end),
      });
      return;
    }
    if (block.kind === "view") {
      diagnostic(
        this.result,
        this.path,
        this.source,
        block.start,
        "PRISMA_VIEW",
        "Views are not materialized as tables.",
      );
      return;
    }
    this.model(block);
  }
  private model(block: Block) {
    const rows = records(block.body, this.source);
    const nameDirective = rows.find(
      (row) =>
        row[0].value === "@" &&
        row[1]?.value === "@" &&
        row[2]?.value === "map",
    );
    const namespaceDirective = rows.find((row) => row[2]?.value === "schema");
    const name = nameDirective
      ? (args(nameDirective, "map")[0]?.value ?? block.name)
      : block.name;
    const namespace = namespaceDirective
      ? (args(namespaceDirective, "schema")[0]?.value ?? "public")
      : "public";
    const target = table(
      "prisma",
      name,
      this.path,
      this.source,
      block.start,
      block.end,
      namespace,
    );
    target.modelName = block.name;
    for (const row of rows) {
      if (row[0].value === "@") this.modelConstraint(target, row, block);
      else this.column(target, row);
    }
    this.result.tables.push(target);
  }
  private scalar(type: string) {
    return (
      scalarTypes.has(type) ||
      this.blocks.some((block) => block.kind === "enum" && block.name === type)
    );
  }
  private nativeType(row: Token[]) {
    const native = row.findIndex(
      (token, index) => token.value === "db" && row[index + 1]?.value === ".",
    );
    if (native < 0) return null;
    const end =
      row[native + 3]?.value === "(" ? matching(row, native + 3) : native + 2;
    return this.source.slice(row[native + 2].start, row[end].end);
  }
  private column(target: SchemaTable, row: Token[]) {
    const field = row[0],
      type = row[1];
    if (!type) return;
    if (!this.scalar(type.value)) {
      if (
        !this.blocks.some(
          (item) => item.kind === "model" && item.name === type.value,
        )
      )
        diagnostic(
          this.result,
          this.path,
          this.source,
          field.start,
          "PRISMA_UNRESOLVED_TYPE",
          "Field type is not a declared scalar, enum or model.",
        );
      return;
    }
    const name = args(row, "map")[0]?.value ?? field.value;
    const initial = args(row, "default");
    const primary = row.some((token) => token.value === "id"),
      unique = row.some((token) => token.value === "unique");
    const dataType = this.nativeType(row) ?? type.value;
    const column = {
      id: identity(target.id, name),
      name,
      type: dataType + (row[2]?.value === "[" ? "[]" : ""),
      nullable: row[2]?.value === "?",
      primaryKey: primary,
      unique,
      defaultValue: initial.length
        ? this.source.slice(initial[0].start, initial[initial.length - 1].end)
        : null,
      evidence: this.location(row),
    };
    target.columns.push(column);
    if (primary) this.inlineConstraint(target, name, "primary-key", row);
    if (unique) this.inlineConstraint(target, name, "unique", row);
  }
  private inlineConstraint(
    target: SchemaTable,
    name: string,
    kind: "primary-key" | "unique",
    row: Token[],
  ) {
    target.constraints.push({
      id: identity(target.id, kind, name),
      name: `${target.name}_${name}_${kind}`,
      kind,
      columns: [name],
      expression: null,
      evidence: this.location(row),
    });
  }
  private mappedColumns(input: string[], block: Block) {
    const rows = records(block.body, this.source);
    return input.map((name) => {
      const field = rows.find((item) => item[0].value === name);
      return field ? (args(field, "map")[0]?.value ?? name) : name;
    });
  }
  private modelConstraint(target: SchemaTable, row: Token[], block: Block) {
    if (row[1]?.value !== "@") return;
    const kind = constraintKinds[row[2]?.value];
    if (!kind) return;
    const input = args(row, row[2].value);
    const open = input.findIndex((token) => token.value === "[");
    const columns =
      open < 0
        ? []
        : this.mappedColumns(
            names(input.slice(open + 1, matching(input, open, "[", "]"))),
            block,
          );
    const name = `${target.name}_${kind}_${columns.join("_")}`;
    target.constraints.push({
      id: identity(target.id, name),
      name,
      kind,
      columns,
      expression: null,
      evidence: this.location(row),
    });
  }
  private relation(block: Block, target: SchemaTable, row: Token[]) {
    const model = this.result.tables.find(
      (item) => item.modelName === row[1]?.value,
    );
    if (!model) return;
    const modelBlock = this.blocks.find(
      (item) => item.name === model.modelName,
    );
    if (!modelBlock) return;
    const input = args(row, "relation");
    const columns = this.mappedColumns(arrayArg(input, "fields"), block);
    const targetColumns = this.mappedColumns(
      arrayArg(input, "references"),
      modelBlock,
    );
    const many =
      row[2]?.value === "[" &&
      records(modelBlock.body, this.source).some(
        (other) => other[1]?.value === block.name && other[2]?.value === "[",
      );
    if (!columns.length && !many) return;
    const name = `${target.name}.${row[0].value}`;
    const deletion = input.findIndex((token) => token.value === "onDelete");
    this.result.relations.push({
      id: identity(target.id, name),
      name,
      sourceTableId: target.id,
      targetTableId: model.id,
      targetName: model.name,
      columns,
      targetColumns,
      cardinality: many ? "many-to-many" : "one-to-many",
      resolution: "DIRECT",
      onDelete: deletion < 0 ? null : (input[deletion + 2]?.value ?? null),
      evidence: this.location(row),
    });
    if (columns.length)
      target.constraints.push({
        id: identity(target.id, name, "fk"),
        name,
        kind: "foreign-key",
        columns,
        expression: null,
        evidence: this.location(row),
      });
  }
}
export const extractPrisma = (path: string, source: string): Extraction =>
  new PrismaParser(path, source).read();
