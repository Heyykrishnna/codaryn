import type { SchemaTable } from "@codaryn/contracts";
import {
  diagnostic,
  emptyExtraction,
  evidence,
  identity,
  table,
  tableId,
  type Extraction,
} from "./model.js";
import {
  is,
  matching,
  names,
  qualified,
  split,
  tokenize,
  type Token,
} from "./tokens.js";
const modifiers = new Set([
  "NOT",
  "NULL",
  "DEFAULT",
  "PRIMARY",
  "UNIQUE",
  "REFERENCES",
  "CHECK",
  "CONSTRAINT",
  "COLLATE",
  "GENERATED",
]);
function slice(source: string, tokens: Token[]) {
  return tokens.length
    ? source
        .slice(tokens[0].start, tokens[tokens.length - 1].end)
        .slice(0, 4096)
    : "";
}
function relation(
  target: SchemaTable,
  columns: string[],
  tokens: Token[],
  path: string,
  source: string,
  result: Extraction,
  label: string,
) {
  const at = tokens.findIndex((token) => is(token, "REFERENCES"));
  if (at < 0) return;
  const ref = qualified(tokens, at + 1);
  const open = ref.next;
  const targetColumns =
    tokens[open]?.value === "("
      ? names(tokens.slice(open + 1, matching(tokens, open)))
      : [];
  const deletion = tokens.findIndex(
    (token, index) => is(token, "ON") && is(tokens[index + 1], "DELETE"),
  );
  result.relations.push({
    id: identity(target.id, "relation", label),
    name: label,
    sourceTableId: target.id,
    targetTableId: tableId("sql", ref.namespace, ref.name),
    targetName: `${ref.namespace}.${ref.name}`,
    columns,
    targetColumns,
    cardinality: "one-to-many",
    resolution: "DIRECT",
    onDelete:
      deletion < 0
        ? null
        : tokens
            .slice(deletion + 2, deletion + 4)
            .map((token) => token.value)
            .join(" ")
            .trim(),
    evidence: evidence(
      path,
      source,
      tokens[0].start,
      tokens[tokens.length - 1].end,
    ),
  });
}
function constraint(
  target: SchemaTable,
  tokens: Token[],
  path: string,
  source: string,
  result: Extraction,
) {
  let at = 0;
  let label = "";
  if (is(tokens[0], "CONSTRAINT")) {
    label = tokens[1]?.value ?? "";
    at = 2;
  }
  const first = tokens[at]?.value.toUpperCase();
  const kind =
    first === "PRIMARY"
      ? "primary-key"
      : first === "FOREIGN"
        ? "foreign-key"
        : first === "UNIQUE"
          ? "unique"
          : first === "CHECK"
            ? "check"
            : "index";
  const open = tokens.findIndex(
    (token, index) => index >= at && token.value === "(",
  );
  const columns =
    open >= 0 && kind !== "check"
      ? names(tokens.slice(open + 1, matching(tokens, open)))
      : [];
  label ||= `${target.name}_${kind}_${columns.join("_")}`;
  target.constraints.push({
    id: identity(target.id, label),
    name: label,
    kind,
    columns,
    expression: kind === "check" ? slice(source, tokens.slice(at + 1)) : null,
    evidence: evidence(
      path,
      source,
      tokens[0].start,
      tokens[tokens.length - 1].end,
    ),
  });
  if (kind === "foreign-key")
    relation(target, columns, tokens, path, source, result, label);
}
function column(
  target: SchemaTable,
  tokens: Token[],
  path: string,
  source: string,
  result: Extraction,
) {
  if (!tokens[1]) return;
  if (
    ["CONSTRAINT", "PRIMARY", "FOREIGN", "UNIQUE", "CHECK"].some((value) =>
      is(tokens[0], value),
    )
  ) {
    constraint(target, tokens, path, source, result);
    return;
  }
  const name = tokens[0].value;
  let end = 1;
  let depth = 0;
  while (end < tokens.length) {
    const token = tokens[end];
    if (
      depth === 0 &&
      !token.quoted &&
      modifiers.has(token.value.toUpperCase())
    )
      break;
    if (token.value === "(") depth++;
    if (token.value === ")") depth--;
    end++;
  }
  const primary = tokens.some(
    (token, index) => is(token, "PRIMARY") && is(tokens[index + 1], "KEY"),
  );
  const unique = tokens.some((token) => is(token, "UNIQUE"));
  const defaultAt = tokens.findIndex((token) => is(token, "DEFAULT"));
  let defaultEnd = defaultAt + 1;
  depth = 0;
  if (defaultAt >= 0)
    while (defaultEnd < tokens.length) {
      const token = tokens[defaultEnd];
      if (
        defaultEnd > defaultAt + 1 &&
        depth === 0 &&
        !token.quoted &&
        modifiers.has(token.value.toUpperCase())
      )
        break;
      if (token.value === "(") depth++;
      if (token.value === ")") depth--;
      defaultEnd++;
    }
  target.columns.push({
    id: identity(target.id, name),
    name,
    type: slice(source, tokens.slice(1, end)) || "unknown",
    nullable:
      !primary &&
      !tokens.some(
        (token, index) => is(token, "NOT") && is(tokens[index + 1], "NULL"),
      ),
    defaultValue:
      defaultAt < 0
        ? null
        : slice(source, tokens.slice(defaultAt + 1, defaultEnd)),
    primaryKey: primary,
    unique,
    evidence: evidence(
      path,
      source,
      tokens[0].start,
      tokens[tokens.length - 1].end,
    ),
  });
  for (const kind of [
    primary ? "primary-key" : null,
    unique ? "unique" : null,
  ] as const)
    if (kind)
      target.constraints.push({
        id: identity(target.id, kind, name),
        name: `${target.name}_${name}_${kind}`,
        kind,
        columns: [name],
        expression: null,
        evidence: target.columns[target.columns.length - 1].evidence,
      });
  if (tokens.some((token) => is(token, "REFERENCES"))) {
    const label = `${target.name}_${name}_fkey`;
    target.constraints.push({
      id: identity(target.id, label),
      name: label,
      kind: "foreign-key",
      columns: [name],
      expression: null,
      evidence: target.columns[target.columns.length - 1].evidence,
    });
    relation(target, [name], tokens, path, source, result, label);
  }
  if (tokens.some((token) => is(token, "GENERATED")))
    diagnostic(
      result,
      path,
      source,
      tokens[0].start,
      "SQL_GENERATED",
      "Generated expression is preserved in source; expression evaluation is unsupported.",
    );
}
function applyStatement(
  tokens: Token[],
  path: string,
  source: string,
  result: Extraction,
) {
  if (!tokens.length) return;
  const upper = tokens.map((token) => token.value.toUpperCase());
  const typeAt = upper.indexOf("TYPE");
  if (is(tokens[0], "CREATE") && typeAt === 1 && upper.includes("ENUM")) {
    const name = qualified(tokens, 2);
    const open = tokens.findIndex((token) => token.value === "(");
    if (open < 0) throw new Error("Missing enum values");
    result.enums.push({
      id: identity("sql", name.namespace, name.name),
      adapter: "sql",
      name: `${name.namespace}.${name.name}`,
      values: names(tokens.slice(open + 1, matching(tokens, open))),
      evidence: evidence(
        path,
        source,
        tokens[0].start,
        tokens[tokens.length - 1].end,
      ),
    });
    return;
  }
  const tableAt = upper.indexOf("TABLE");
  if (is(tokens[0], "CREATE") && tableAt === 1) {
    const nameAt = is(tokens[2], "IF") ? 5 : 2;
    const name = qualified(tokens, nameAt);
    const open = name.next;
    if (tokens[open]?.value !== "(")
      throw new Error("CREATE TABLE requires a column list");
    if (
      result.tables.some(
        (item) => item.id === tableId("sql", name.namespace, name.name),
      )
    ) {
      diagnostic(
        result,
        path,
        source,
        tokens[0].start,
        "DUPLICATE_TABLE",
        "Table is already declared; subsequent CREATE was not applied.",
      );
      return;
    }
    const target = table(
      "sql",
      name.name,
      path,
      source,
      tokens[0].start,
      tokens[tokens.length - 1].end,
      name.namespace,
    );
    for (const part of split(tokens.slice(open + 1, matching(tokens, open))))
      column(target, part, path, source, result);
    result.tables.push(target);
    return;
  }
  if (is(tokens[0], "CREATE") && upper.includes("INDEX")) {
    const indexAt = upper.indexOf("INDEX");
    const on = upper.indexOf("ON");
    const name = qualified(tokens, on + 1);
    const target = result.tables.find(
      (item) => item.id === tableId("sql", name.namespace, name.name),
    );
    if (!target) throw new Error("Index target is unavailable");
    const open = tokens.findIndex(
      (token, index) => index > on && token.value === "(",
    );
    if (open < 0) throw new Error("Missing index columns");
    const label =
      tokens[is(tokens[indexAt + 1], "IF") ? indexAt + 4 : indexAt + 1]
        ?.value ?? "index";
    target.constraints.push({
      id: identity(target.id, label),
      name: label,
      kind: upper.includes("UNIQUE") ? "unique" : "index",
      columns: names(tokens.slice(open + 1, matching(tokens, open))),
      expression: slice(source, tokens.slice(open)),
      evidence: evidence(
        path,
        source,
        tokens[0].start,
        tokens[tokens.length - 1].end,
      ),
    });
    return;
  }
  if (is(tokens[0], "ALTER") && tableAt === 1) {
    const name = qualified(tokens, 2);
    const target = result.tables.find(
      (item) => item.id === tableId("sql", name.namespace, name.name),
    );
    if (!target) throw new Error("ALTER target is unavailable");
    for (const action of split(tokens.slice(name.next))) {
      if (is(action[0], "ADD")) {
        const content = is(action[1], "COLUMN")
          ? action.slice(2)
          : action.slice(1);
        column(target, content, path, source, result);
      } else if (is(action[0], "DROP") && is(action[1], "COLUMN")) {
        const name = action[2]?.value;
        target.columns = target.columns.filter((item) => item.name !== name);
        target.constraints = target.constraints.filter(
          (item) => !item.columns.includes(name),
        );
        result.relations = result.relations.filter(
          (item) =>
            item.sourceTableId !== target.id || !item.columns.includes(name),
        );
      } else if (is(action[0], "ALTER") && is(action[1], "COLUMN")) {
        const item = target.columns.find(
          (item) => item.name === action[2]?.value,
        );
        if (!item) throw new Error("Unknown ALTER column");
        if (is(action[3], "TYPE")) item.type = slice(source, action.slice(4));
        else if (is(action[3], "SET") && is(action[4], "NOT"))
          item.nullable = false;
        else if (is(action[3], "DROP") && is(action[4], "NOT"))
          item.nullable = true;
        else if (is(action[3], "SET") && is(action[4], "DEFAULT"))
          item.defaultValue = slice(source, action.slice(5));
        else if (is(action[3], "DROP") && is(action[4], "DEFAULT"))
          item.defaultValue = null;
        else throw new Error("Unsupported ALTER COLUMN operation");
        item.evidence = evidence(
          path,
          source,
          action[0].start,
          action[action.length - 1].end,
        );
      } else
        diagnostic(
          result,
          path,
          source,
          action[0].start,
          "SQL_UNSUPPORTED",
          "Unsupported ALTER operation was not applied.",
        );
    }
    return;
  }
  if (is(tokens[0], "DROP") && is(tokens[1], "TABLE")) {
    const name = qualified(tokens, is(tokens[2], "IF") ? 4 : 2);
    const id = tableId("sql", name.namespace, name.name);
    result.tables = result.tables.filter((item) => item.id !== id);
    result.relations = result.relations.filter(
      (item) => item.sourceTableId !== id,
    );
    return;
  }
  diagnostic(
    result,
    path,
    source,
    tokens[0].start,
    "SQL_UNSUPPORTED",
    "Statement is outside the supported static DDL subset and was not executed.",
  );
}
export function extractSql(
  files: { path: string; content: string }[],
): Extraction {
  const result = emptyExtraction();
  for (const { path, content } of files) {
    try {
      for (const statement of split(tokenize(content), ";")) {
        const before = structuredClone(result);
        try {
          applyStatement(statement, path, content, result);
        } catch {
          Object.assign(result, before);
          diagnostic(
            result,
            path,
            content,
            statement[0]?.start ?? 0,
            "SQL_UNSUPPORTED",
            "Malformed or unsupported DDL declaration was not applied.",
          );
        }
      }
    } catch {
      diagnostic(
        result,
        path,
        content,
        0,
        "SQL_PARSE",
        "Unable to tokenize SQL safely.",
      );
    }
  }
  return result;
}
