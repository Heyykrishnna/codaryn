import { posix } from "node:path";
import type {
  SchemaSnapshot,
  SchemaTable,
  SchemaRelation,
} from "@codaryn/contracts";
import { identity } from "./model.js";
function isUnique(table: SchemaTable, columns: string[]) {
  const key = [...columns].sort().join("\0");
  return (
    columns.length > 0 &&
    table.constraints.some(
      (item) =>
        ["primary-key", "unique"].includes(item.kind) &&
        [...item.columns].sort().join("\0") === key,
    )
  );
}
function foreignTarget(
  reference: string,
  from: string,
  bindings: Map<string, string>,
) {
  if (!reference.startsWith(".")) return bindings.get(`${from}:${reference}`);
  const at = reference.lastIndexOf(":");
  const module = reference.slice(0, at),
    symbol = reference.slice(at + 1);
  const base = posix
    .normalize(posix.join(posix.dirname(from), module))
    .replace(/\.[cm]?[jt]s$/, "");
  for (const suffix of [".ts", ".js", "/index.ts", ".mts"]) {
    const id = bindings.get(`${base}${suffix}:${symbol}`);
    if (id) return id;
  }
  return undefined;
}
export function resolveDrizzleReferences(
  snapshot: SchemaSnapshot,
  bindings: Map<string, string>,
  columns: Map<string, string>,
) {
  for (const relation of snapshot.relations.filter((item) =>
    item.sourceTableId.startsWith("drizzle:"),
  )) {
    const source = snapshot.tables.find(
      (item) => item.id === relation.sourceTableId,
    );
    if (!source) continue;
    const target = foreignTarget(
      relation.targetName,
      source.evidence.path,
      bindings,
    );
    relation.targetTableId = target ?? null;
    relation.targetColumns = relation.targetColumns.map(
      (name) => columns.get(`${target}:${name}`) ?? name,
    );
  }
}
function inferredRelation(
  snapshot: SchemaSnapshot,
  source: SchemaTable,
  column: SchemaTable["columns"][number],
) {
  if (
    !column.name.endsWith("_id") ||
    snapshot.relations.some(
      (item) =>
        item.sourceTableId === source.id && item.columns.includes(column.name),
    )
  )
    return null;
  const base = column.name.slice(0, -3);
  const candidates = snapshot.tables.filter(
    (item) =>
      item.adapter === source.adapter &&
      item.namespace === source.namespace &&
      [base, `${base}s`].includes(item.name) &&
      item.columns.some((item) => item.name === "id"),
  );
  if (candidates.length !== 1) return null;
  const target = candidates[0];
  return {
    id: identity(source.id, column.name, "inferred"),
    name: `${source.name}.${column.name} (inferred)`,
    sourceTableId: source.id,
    targetTableId: target.id,
    targetName: target.name,
    columns: [column.name],
    targetColumns: ["id"],
    cardinality: "one-to-many" as const,
    resolution: "INFERRED" as const,
    onDelete: null,
    evidence: column.evidence,
  };
}
export function inferNamingRelations(snapshot: SchemaSnapshot) {
  for (const source of snapshot.tables)
    for (const column of source.columns) {
      const inferred = inferredRelation(snapshot, source, column);
      if (inferred) snapshot.relations.push(inferred);
    }
}
function applyConstraintFlags(table: SchemaTable) {
  for (const constraint of table.constraints)
    for (const name of constraint.columns) {
      const column = table.columns.find((item) => item.name === name);
      if (!column) continue;
      if (constraint.kind === "primary-key") {
        column.primaryKey = true;
        column.nullable = false;
      }
      if (constraint.kind === "unique" && constraint.columns.length === 1)
        column.unique = true;
    }
}
function validReference(
  source: SchemaTable,
  target: SchemaTable,
  relation: SchemaRelation,
) {
  const columnsExist =
    relation.columns.every((name) =>
      source.columns.some((item) => item.name === name),
    ) &&
    relation.targetColumns.every((name) =>
      target.columns.some((item) => item.name === name),
    );
  const sameLength = relation.columns.length === relation.targetColumns.length;
  return (
    columnsExist &&
    sameLength &&
    (relation.cardinality === "many-to-many" ||
      isUnique(target, relation.targetColumns))
  );
}
function completeRelation(snapshot: SchemaSnapshot, relation: SchemaRelation) {
  const source = snapshot.tables.find(
      (item) => item.id === relation.sourceTableId,
    ),
    target = snapshot.tables.find((item) => item.id === relation.targetTableId);
  if (!source || !target || !validReference(source, target, relation)) {
    relation.resolution = "UNRESOLVED";
    relation.targetTableId = null;
    return;
  }
  if (relation.cardinality !== "many-to-many")
    relation.cardinality = isUnique(source, relation.columns)
      ? "one-to-one"
      : "one-to-many";
}
function joinRelation(
  snapshot: SchemaSnapshot,
  table: SchemaTable,
): SchemaRelation | null {
  const refs = snapshot.relations.filter(
    (item) => item.sourceTableId === table.id && item.resolution === "DIRECT",
  );
  const columns = [...new Set(refs.flatMap((item) => item.columns))];
  table.joinTable = refs.length >= 2 && isUnique(table, columns);
  if (
    !table.joinTable ||
    refs.length !== 2 ||
    !refs[0].targetTableId ||
    !refs[1].targetTableId
  )
    return null;
  return {
    id: identity(table.id, "many-to-many"),
    name: `via ${table.name}`,
    sourceTableId: refs[0].targetTableId,
    targetTableId: refs[1].targetTableId,
    targetName: refs[1].targetName,
    columns: refs[0].targetColumns,
    targetColumns: refs[1].targetColumns,
    cardinality: "many-to-many",
    resolution: "RESOLVED",
    onDelete: null,
    evidence: table.evidence,
  };
}
export function finalizeRelations(snapshot: SchemaSnapshot) {
  snapshot.tables.forEach(applyConstraintFlags);
  snapshot.relations.forEach((relation) =>
    completeRelation(snapshot, relation),
  );
  const joins = snapshot.tables
    .map((table) => joinRelation(snapshot, table))
    .filter((item): item is SchemaRelation => item !== null);
  snapshot.relations.push(...joins);
}
