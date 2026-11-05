import type { DiagramGraph, DiagramLayoutConfig } from "@codaryn/contracts";

function escapeXml(unsafe: string): string {
  return unsafe
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export function renderSvg(
  graph: DiagramGraph,
  layoutConfig?: DiagramLayoutConfig,
): string {
  const nodeWidth = 200;
  const nodeHeight = 70;
  const cols = Math.max(1, Math.ceil(Math.sqrt(graph.nodes.length)));

  const positions: Record<string, { x: number; y: number }> = {};

  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    if (!node) continue;
    if (layoutConfig?.positions[node.id]) {
      positions[node.id] = layoutConfig.positions[node.id]!;
    } else {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positions[node.id] = {
        x: 60 + col * (nodeWidth + 60),
        y: 60 + row * (nodeHeight + 80),
      };
    }
  }

  let maxX = 600;
  let maxY = 400;

  for (const pos of Object.values(positions)) {
    maxX = Math.max(maxX, pos.x + nodeWidth + 60);
    maxY = Math.max(maxY, pos.y + nodeHeight + 120);
  }

  const svgParts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${maxX} ${maxY}" width="${maxX}" height="${maxY}">`,
    "  <defs>",
    '    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">',
    '      <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b"/>',
    "    </marker>",
    "  </defs>",
    '  <rect width="100%" height="100%" fill="#f8fafc"/>',
  ];

  for (const edge of graph.edges) {
    const src = positions[edge.source];
    const tgt = positions[edge.target];
    if (!src || !tgt) continue;

    const x1 = src.x + nodeWidth / 2;
    const y1 = src.y + nodeHeight / 2;
    const x2 = tgt.x + nodeWidth / 2;
    const y2 = tgt.y + nodeHeight / 2;

    const strokeColor =
      edge.status === "DIRECT"
        ? "#16a34a"
        : edge.status === "RESOLVED"
          ? "#2563eb"
          : edge.status === "INFERRED"
            ? "#d97706"
            : "#dc2626";

    const strokeDash = edge.status === "INFERRED" ? 'stroke-dasharray="4,4"' : "";

    svgParts.push(
      `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="2" ${strokeDash} marker-end="url(#arrow)"/>`,
    );

    if (edge.label) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 - 8;
      svgParts.push(
        `  <text x="${midX}" y="${midY}" fill="#475569" font-size="11" text-anchor="middle" font-family="sans-serif">${escapeXml(edge.label)}</text>`,
      );
    }
  }

  for (const node of graph.nodes) {
    const pos = positions[node.id];
    if (!pos) continue;

    const fillBg =
      node.status === "DIRECT"
        ? "#dcfce7"
        : node.status === "RESOLVED"
          ? "#dbeafe"
          : node.status === "INFERRED"
            ? "#fef3c7"
            : "#fee2e2";

    const stroke =
      node.status === "DIRECT"
        ? "#16a34a"
        : node.status === "RESOLVED"
          ? "#2563eb"
          : node.status === "INFERRED"
            ? "#d97706"
            : "#dc2626";

    svgParts.push(
      `  <g id="node_${escapeXml(node.id)}">`,
      `    <rect x="${pos.x}" y="${pos.y}" width="${nodeWidth}" height="${nodeHeight}" rx="8" fill="${fillBg}" stroke="${stroke}" stroke-width="1.5"/>`,
      `    <text x="${pos.x + 12}" y="${pos.y + 26}" font-size="13" font-weight="bold" fill="#0f172a" font-family="sans-serif">${escapeXml(node.label)}</text>`,
      `    <text x="${pos.x + 12}" y="${pos.y + 46}" font-size="11" fill="#475569" font-family="sans-serif">${escapeXml(node.kind)} · ${node.status}</text>`,
      "  </g>",
    );
  }

  svgParts.push("</svg>");
  return svgParts.join("\n");
}
