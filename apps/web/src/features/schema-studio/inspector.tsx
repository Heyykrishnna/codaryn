"use client";
import { useState } from "react";
import type { z } from "zod";
import { tableDetailSchema } from "./api";
import { control } from "@/src/features/repositories/api";
export function SchemaInspector({
  detail,
}: Readonly<{ detail: z.infer<typeof tableDetailSchema> }>) {
  const [columnId, setColumnId] = useState("");
  const [relationId, setRelationId] = useState("");
  const { table } = detail;
  const column = table.columns.find((item) => item.id === columnId);
  const relation = detail.relations.find((item) => item.id === relationId);
  return (
    <section
      id="schema-table-inspector"
      aria-label="Schema inspector"
      className="flex min-w-0 flex-col gap-5 rounded-xl border border-zinc-300 p-5 dark:border-zinc-700"
    >
      <h2 className="text-xl font-semibold">
        {table.namespace}.{table.name}
      </h2>
      <p>
        {table.adapter} · {table.joinTable ? "Join table" : "Table"} ·{" "}
        {table.evidence.path}:{table.evidence.startLine}–
        {table.evidence.endLine}
      </p>
      <label className="flex flex-col gap-2">
        <span>Column inspector</span>
        <select
          className={control}
          value={columnId}
          onChange={(event) => setColumnId(event.target.value)}
        >
          <option value="">Select a column</option>
          {table.columns.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.type}
            </option>
          ))}
        </select>
      </label>
      {column && (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt>Type</dt>
          <dd className="break-all">{column.type}</dd>
          <dt>Nullable</dt>
          <dd>{String(column.nullable)}</dd>
          <dt>Default</dt>
          <dd className="break-all">{column.defaultValue ?? "None"}</dd>
          <dt>Primary key</dt>
          <dd>{String(column.primaryKey)}</dd>
          <dt>Unique</dt>
          <dd>{String(column.unique)}</dd>
          <dt>Source</dt>
          <dd className="break-all">
            {column.evidence.path}:{column.evidence.startLine}
          </dd>
        </dl>
      )}
      <div className="overflow-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold">
            Constraints and indexes
          </caption>
          <thead>
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2">Kind</th>
              <th className="p-2">Columns</th>
            </tr>
          </thead>
          <tbody>
            {table.constraints.map((item) => (
              <tr
                key={item.id}
                className="border-t border-zinc-300 dark:border-zinc-700"
              >
                <td className="p-2">{item.name}</td>
                <td className="p-2">{item.kind}</td>
                <td className="p-2">
                  {item.columns.join(", ")}
                  {item.expression && (
                    <pre className="max-w-sm overflow-auto text-xs">
                      {item.expression}
                    </pre>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {table.constraints.length === 0 && (
          <p>No declared constraints or indexes.</p>
        )}
      </div>
      <label className="flex flex-col gap-2">
        <span>Relation inspector</span>
        <select
          className={control}
          value={relationId}
          onChange={(event) => setRelationId(event.target.value)}
        >
          <option value="">Select a relation</option>
          {detail.relations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {item.resolution}
            </option>
          ))}
        </select>
      </label>
      {relation && (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            {relation.columns.join(", ")} → {relation.targetName} (
            {relation.targetColumns.join(", ")})
          </p>
          <p>
            {relation.cardinality} · {relation.resolution} · on delete:{" "}
            {relation.onDelete ?? "Not specified"}
          </p>
          <p>
            Evidence: {relation.evidence.path}:{relation.evidence.startLine}
          </p>
        </div>
      )}
      <details>
        <summary className="cursor-pointer font-semibold">
          Schema source panel
        </summary>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-zinc-100 p-4 text-xs dark:bg-zinc-950">
          {table.source}
        </pre>
      </details>
      <section aria-label="Schema lineage">
        <h3 className="font-semibold">Application lineage and evidence</h3>
        <ul className="flex flex-col gap-2">
          {detail.lineage.map((item) => (
            <li key={item.id} className="text-sm break-all">
              {item.kind}: {item.name} →{" "}
              {column && item.columnId === column.id ? column.name : table.name}{" "}
              · {item.resolution} · {item.evidence.path}:
              {item.evidence.startLine}
            </li>
          ))}
        </ul>
        {detail.gaps.map((gap) => (
          <p
            key={gap}
            className="mt-2 text-sm text-amber-800 dark:text-amber-300"
          >
            UNRESOLVED: {gap}
          </p>
        ))}
      </section>
    </section>
  );
}
