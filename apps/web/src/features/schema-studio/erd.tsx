"use client";
import type { SchemaTable, SchemaRelation } from "@codaryn/contracts";
export function SchemaDiagram({
  tables,
  relations,
  layout,
  selected,
  onSelect,
}: Readonly<{
  tables: SchemaTable[];
  relations: SchemaRelation[];
  layout: "er" | "compact";
  selected: string;
  onSelect: (id: string) => void;
}>) {
  const columns = layout === "compact" ? 3 : 2;
  const spacing = layout === "compact" ? 180 : 370;
  const positions = [...tables]
    .sort((a, b) => `${a.domain}:${a.id}`.localeCompare(`${b.domain}:${b.id}`))
    .map((table, index) => ({
      table,
      x: 30 + (index % columns) * 340,
      y: 40 + Math.floor(index / columns) * spacing,
      height:
        layout === "compact"
          ? 120
          : Math.min(315, 70 + table.columns.length * 21),
    }));
  const height = Math.max(
    220,
    ...positions.map((item) => item.y + item.height + 30),
  );
  return (
    <section
      aria-label="Entity relationship diagram"
      className="flex min-w-0 flex-col gap-3"
    >
      <p className="text-sm">
        Solid: declared or resolved. Dashed amber: inferred. One-to-many
        connects a child foreign key to its parent. Full columns and constraints
        are available in the inspector.
      </p>
      <div className="max-h-[700px] overflow-auto rounded-xl border border-zinc-300 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-950">
        <svg
          role="img"
          aria-labelledby="schema-erd-title"
          viewBox={`0 0 ${columns * 340 + 30} ${height}`}
          width={columns * 340 + 30}
          height={height}
          className="max-w-none"
        >
          <title id="schema-erd-title">
            Schema tables and evidence-backed relationships
          </title>
          {relations.map((relation) => {
            const from = positions.find(
                (item) => item.table.id === relation.sourceTableId,
              ),
              to = positions.find(
                (item) => item.table.id === relation.targetTableId,
              );
            if (!from || !to) return null;
            const self = from.table.id === to.table.id;
            const path = self
              ? `M${from.x + 300},${from.y + 40} C${from.x + 335},${from.y + 40} ${from.x + 335},${from.y + 105} ${from.x + 300},${from.y + 105}`
              : `M${from.x + 300},${from.y + 40} C${from.x + 330},${from.y + 90} ${to.x - 30},${to.y + 90} ${to.x},${to.y + 40}`;
            return (
              <g key={relation.id}>
                <path
                  d={path}
                  className={
                    relation.resolution === "INFERRED"
                      ? "fill-none stroke-amber-600 [stroke-dasharray:6_4] dark:stroke-amber-400"
                      : "fill-none stroke-zinc-400 dark:stroke-zinc-500"
                  }
                />
                <text
                  x={(from.x + 300 + to.x) / 2}
                  y={(from.y + to.y) / 2 + 55}
                  className="fill-zinc-900 text-[10px] dark:fill-zinc-100"
                >
                  {relation.cardinality}
                </text>
                <title>
                  {relation.name} · {relation.resolution}
                </title>
              </g>
            );
          })}
          {positions.map(({ table, x, y, height }) => (
            <a
              key={table.id}
              href="#schema-table-inspector"
              onClick={() => onSelect(table.id)}
              aria-label={`Inspect ${table.name}`}
              className="focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
            >
              <rect
                x={x}
                y={y}
                width={300}
                height={height}
                rx={8}
                className={
                  selected === table.id
                    ? "fill-zinc-800 stroke-zinc-200 stroke-2"
                    : "fill-[#14151a] stroke-zinc-700"
                }
              />
              <text
                x={x + 12}
                y={y + 24}
                className="fill-zinc-950 text-sm font-semibold dark:fill-zinc-50"
              >
                {table.name.slice(0, 32)}
                {table.joinTable ? " (join)" : ""}
              </text>
              <text
                x={x + 12}
                y={y + 43}
                className="fill-zinc-600 text-[10px] dark:fill-zinc-400"
              >
                {table.domain.slice(0, 45)}
              </text>
              {layout === "er" &&
                table.columns.map((column, index) => (
                  <text
                    key={column.id}
                    x={x + 12}
                    y={y + 65 + index * 21}
                    className="fill-zinc-800 text-xs dark:fill-zinc-200"
                  >
                    {`${column.primaryKey ? "PK " : ""}${column.name}: ${column.type}${column.nullable ? " ?" : ""}`.slice(
                      0,
                      43,
                    )}
                  </text>
                ))}
            </a>
          ))}
        </svg>
      </div>
    </section>
  );
}
