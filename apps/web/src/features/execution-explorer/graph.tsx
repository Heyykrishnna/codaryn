import { useId } from "react";
type Node = { id: string; name: string; kind: string };
type Edge = {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  deferred?: boolean;
};
export function ExecutionGraph({
  nodes,
  edges,
  onSelect,
  title,
}: Readonly<{
  nodes: Node[];
  edges: Edge[];
  onSelect?: (id: string) => void;
  title: string;
}>) {
  const marker = useId();
  const positions = nodes.slice(0, 100).map((node, index) => ({
    ...node,
    x: 30 + (index % 3) * 280,
    y: 35 + Math.floor(index / 3) * 100,
  }));
  const height = Math.max(160, Math.ceil(positions.length / 3) * 100 + 40);
  return (
    <section className="flex min-w-0 flex-col gap-3" aria-label={title}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm">
        Static potential edges only. Dashed lines are deferred callback
        references. Arrowheads show direction. Select a function to inspect its
        evidence.
      </p>
      <div className="max-h-[600px] overflow-auto rounded-xl border border-dotted border-neutral-300 bg-neutral-50 p-3">
        <svg
          width="870"
          height={height}
          viewBox={`0 0 870 ${height}`}
          role="img"
          aria-label={title}
          className="max-w-none"
        >
          <defs>
            <marker
              id={marker}
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" className="fill-neutral-800" />
            </marker>
          </defs>
          {edges.slice(0, 500).map((edge) => {
            const from = positions.find((n) => n.id === edge.sourceId),
              to = positions.find((n) => n.id === edge.targetId);
            if (!from || !to) return null;
            const self = from.id === to.id;
            const path = self
              ? `M${from.x + 230},${from.y + 15} C${from.x + 270},${from.y} ${from.x + 270},${from.y + 70} ${from.x + 230},${from.y + 50}`
              : `M${from.x + 115},${from.y + 60} C${from.x + 115},${from.y + 85} ${to.x + 115},${to.y - 20} ${to.x + 115},${to.y}`;
            return (
              <g key={edge.id}>
                <path
                  d={path}
                  markerEnd={`url(#${marker})`}
                  className={
                    edge.deferred
                      ? "fill-none stroke-neutral-500 [stroke-dasharray:6_4]"
                      : "fill-none stroke-neutral-500"
                  }
                />
                <title>{edge.label}</title>
              </g>
            );
          })}
          {positions.map((node) => (
            <a
              key={node.id}
              href="#execution-inspector"
              onClick={() => onSelect?.(node.id)}
              aria-label={`Inspect ${node.name}`}
              className="focus-visible:outline-2 focus-visible:outline-neutral-500"
            >
              <rect
                x={node.x}
                y={node.y}
                width="230"
                height="60"
                rx="8"
                className="fill-white stroke-neutral-400"
              />
              <text
                x={node.x + 10}
                y={node.y + 25}
                className="fill-neutral-900 text-sm font-semibold"
              >
                {node.name.slice(0, 28)}
              </text>
              <text
                x={node.x + 10}
                y={node.y + 46}
                className="fill-neutral-600 text-xs"
              >
                {node.kind}
              </text>
            </a>
          ))}
        </svg>
      </div>
      {nodes.length > 100 && (
        <p>
          Canvas shows 100 nodes. Use the inspector and paginated lists for
          additional objects.
        </p>
      )}
    </section>
  );
}
