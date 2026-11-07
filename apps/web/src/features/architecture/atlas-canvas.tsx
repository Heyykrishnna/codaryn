"use client";

import { useId } from "react";
import type { AtlasGraph, AtlasNode } from "@codaryn/contracts";

const cardWidth = 180;
const cardHeight = 58;
const columnGap = 38;
const rowGap = 34;
const groupWidth = 452;

export function AtlasCanvas({
  graph,
  selected,
  marked,
  select,
}: {
  graph: AtlasGraph;
  selected: string;
  marked: Set<string>;
  select: (node: AtlasNode) => void;
}) {
  const arrow = useId();
  const groups = new Map<string, AtlasNode[]>();
  for (const node of graph.nodes) {
    const group = groups.get(node.group) ?? [];
    group.push(node);
    groups.set(node.group, group);
  }
  let nextY = 16;
  let previousHeight = 0;
  const positions = new Map<string, { x: number; y: number }>();
  const layout = [...groups].map(([label, nodes], index) => {
    const x = 16 + (index % 2) * (groupWidth + 24);
    const y = nextY;
    const height = 62 + Math.ceil(nodes.length / 2) * (cardHeight + rowGap);
    nodes.forEach((node, i) =>
      positions.set(node.id, {
        x: x + 20 + (i % 2) * (cardWidth + columnGap),
        y: y + 48 + Math.floor(i / 2) * (cardHeight + rowGap),
      }),
    );
    if (index % 2 === 1) nextY += Math.max(height, previousHeight) + 24;
    previousHeight = height;
    return { label, x, y, height, nodes };
  });
  const width = groups.size === 1 ? groupWidth + 32 : groupWidth * 2 + 56;
  const height = Math.max(
    150,
    ...layout.map((group) => group.y + group.height + 16),
  );

  return (
    <div
      className="border-border bg-card max-h-[68vh] overflow-auto rounded-xl border border-dotted"
      tabIndex={0}
      aria-label="Scrollable architecture canvas"
    >
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="group"
        aria-label="Architecture diagram"
        className="block max-w-none"
      >
        <defs>
          <marker
            id={arrow}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0 10 5 0 10z" className="fill-neutral-600" />
          </marker>
        </defs>
        {layout.map((group) => (
          <g key={group.label}>
            <rect
              x={group.x}
              y={group.y}
              width={groupWidth}
              height={group.height}
              rx="12"
              className="fill-neutral-50 stroke-neutral-400 [stroke-dasharray:2_4]"
            />
            <text
              x={group.x + 20}
              y={group.y + 28}
              className="fill-neutral-700 text-xs font-semibold"
            >
              {group.label.length > 58
                ? `${group.label.slice(0, 57)}…`
                : group.label}
              <title>{group.label}</title>
            </text>
          </g>
        ))}
        {graph.edges.map((edge, index) => {
          const source = positions.get(edge.source);
          const target = positions.get(edge.target);
          if (!source || !target) return null;
          const sameColumn = source.x === target.x;
          const forward = source.x < target.x;
          const fromX = source.x + (forward || sameColumn ? cardWidth : 0);
          const toX =
            target.x + (sameColumn ? cardWidth : forward ? 0 : cardWidth);
          const fromY = source.y + cardHeight / 2;
          const toY = target.y + cardHeight / 2;
          const bend = sameColumn ? fromX + 18 : (fromX + toX) / 2;
          const d =
            edge.source === edge.target
              ? `M ${fromX} ${fromY - 10} C ${bend + 24} ${fromY - 26}, ${bend + 24} ${toY + 26}, ${toX} ${toY + 10}`
              : `M ${fromX} ${fromY} C ${bend} ${fromY}, ${bend} ${toY}, ${toX} ${toY}`;
          return (
            <path
              key={`${edge.source}:${edge.target}:${index}`}
              d={d}
              markerEnd={`url(#${arrow})`}
              strokeDasharray={
                edge.status === "DIRECT" || edge.status === "RESOLVED"
                  ? undefined
                  : "4 4"
              }
              className={`fill-none ${selected === edge.source || selected === edge.target ? "stroke-neutral-900 stroke-2" : "stroke-neutral-500"}`}
            >
              <title>
                {edge.label} ({edge.status.toLowerCase()})
              </title>
            </path>
          );
        })}
        {layout.flatMap(({ nodes }) =>
          nodes.map((node) => {
            const position = positions.get(node.id);
            if (!position) return null;
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={node.title}
                aria-pressed={node.id === selected}
                onClick={() => select(node)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    select(node);
                  }
                }}
                className="group cursor-pointer outline-none"
              >
                <title>{node.title}</title>
                <rect
                  x={position.x}
                  y={position.y}
                  width={cardWidth}
                  height={cardHeight}
                  rx={node.kind === "decision" ? 2 : 8}
                  className={`fill-white group-hover:fill-neutral-100 group-focus-visible:stroke-2 ${node.id === selected || marked.has(node.id) ? "stroke-neutral-900 stroke-2" : "stroke-neutral-400"}`}
                />
                <text
                  x={position.x + 10}
                  y={position.y + 23}
                  className="pointer-events-none fill-neutral-900 text-xs font-semibold"
                >
                  {node.title.length > 24
                    ? `${node.title.slice(0, 23)}…`
                    : node.title}
                </text>
                <text
                  x={position.x + 10}
                  y={position.y + 43}
                  className="pointer-events-none fill-neutral-600 text-xs"
                >
                  {marked.has(node.id) ? "Finding" : node.kind.slice(0, 26)}
                </text>
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
}
