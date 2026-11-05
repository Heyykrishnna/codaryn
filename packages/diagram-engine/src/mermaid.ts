import type { DiagramGraph } from "@codaryn/contracts";

function sanitizeLabel(text: string): string {
  return text.replaceAll('"', "'").replaceAll("\n", " ").trim();
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function renderMermaid(graph: DiagramGraph): string {
  if (graph.diagramType === "erd") {
    const lines = ["erDiagram"];
    for (const node of graph.nodes) {
      const tableId = sanitizeId(node.id);
      lines.push(`    ${tableId} {`);
      const columns = (node.properties?.columns as Array<{ name: string; dataType: string; isPrimaryKey?: boolean }>) ?? [];
      for (const col of columns) {
        const pk = col.isPrimaryKey ? "PK" : "";
        lines.push(`        ${sanitizeId(col.dataType)} ${sanitizeId(col.name)} ${pk}`.trimEnd());
      }
      lines.push("    }");
    }
    for (const edge of graph.edges) {
      const src = sanitizeId(edge.source);
      const tgt = sanitizeId(edge.target);
      const relLabel = sanitizeLabel(edge.label || edge.kind);
      lines.push(`    ${src} ||--o{ ${tgt} : "${relLabel}"`);
    }
    return lines.join("\n");
  }

  const lines = ["flowchart TD"];
  const groups: Record<string, string[]> = {};

  for (const node of graph.nodes) {
    const groupKey = node.group || "default";
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(node.id);
  }

  const hasMultipleGroups = Object.keys(groups).length > 1;

  for (const [groupName, nodeIds] of Object.entries(groups)) {
    if (hasMultipleGroups && groupName !== "default") {
      lines.push(`    subgraph sub_${sanitizeId(groupName)} ["${sanitizeLabel(groupName)}"]`);
    }

    for (const nodeId of nodeIds) {
      const node = graph.nodes.find((item) => item.id === nodeId);
      if (!node) continue;
      const safeId = sanitizeId(node.id);
      const label = sanitizeLabel(`${node.label} (${node.status})`);
      lines.push(`        ${safeId}["${label}"]`);
    }

    if (hasMultipleGroups && groupName !== "default") {
      lines.push("    end");
    }
  }

  for (const edge of graph.edges) {
    const src = sanitizeId(edge.source);
    const tgt = sanitizeId(edge.target);
    const edgeLabel = sanitizeLabel(edge.label ? `${edge.label} [${edge.status}]` : `[${edge.status}]`);
    lines.push(`    ${src} -->|"${edgeLabel}"| ${tgt}`);
  }

  lines.push("    classDef direct fill:#dcfce7,stroke:#16a34a,stroke-width:2px;");
  lines.push("    classDef resolved fill:#dbeafe,stroke:#2563eb,stroke-width:2px;");
  lines.push("    classDef inferred fill:#fef3c7,stroke:#d97706,stroke-width:2px;");
  lines.push("    classDef unresolved fill:#fee2e2,stroke:#dc2626,stroke-width:2px;");

  for (const node of graph.nodes) {
    const safeId = sanitizeId(node.id);
    const statusClass = node.status.toLowerCase();
    lines.push(`    class ${safeId} ${statusClass};`);
  }

  return lines.join("\n");
}
