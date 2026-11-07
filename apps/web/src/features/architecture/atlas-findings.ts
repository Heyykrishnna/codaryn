import { architectureRulesSchema, type AtlasGraph } from "@codaryn/contracts";

type RuleSet = ReturnType<typeof architectureRulesSchema.parse>;

function key(source: string, target: string, label: string, status: string) {
  return JSON.stringify([source, target, label, status]);
}

function pathMatches(path: string, prefix: string) {
  const normalized = prefix.replace(/\/+$/, "");
  return path === normalized || path.startsWith(`${normalized}/`);
}

export function atlasFindings(
  graph: AtlasGraph,
  baseline: AtlasGraph | undefined,
  rules: RuleSet,
) {
  const currentIds = new Set(graph.nodes.map((node) => node.id));
  const baselineIds = new Set(baseline?.nodes.map((node) => node.id));
  const baselineEdges = new Set(
    baseline?.edges.map((edge) =>
      key(edge.source, edge.target, edge.label, edge.status),
    ),
  );
  const currentEdges = new Set(
    graph.edges.map((edge) =>
      key(edge.source, edge.target, edge.label, edge.status),
    ),
  );
  const currentNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const addedNodes = baseline
    ? graph.nodes.filter((node) => !baselineIds.has(node.id))
    : [];
  const removedNodes =
    baseline?.nodes.filter((node) => !currentIds.has(node.id)) ?? [];
  const addedEdges = baseline
    ? graph.edges.filter(
        (edge) =>
          !baselineEdges.has(
            key(edge.source, edge.target, edge.label, edge.status),
          ),
      )
    : [];
  const removedEdges =
    baseline?.edges.filter(
      (edge) =>
        !currentEdges.has(
          key(edge.source, edge.target, edge.label, edge.status),
        ),
    ) ?? [];
  const violations = graph.edges.flatMap((edge) => {
    const source = currentNodes.get(edge.source);
    const target = currentNodes.get(edge.target);
    if (!source?.path || !target?.path) return [];
    const from = source.path;
    const to = target.path;
    return rules.rules
      .filter(
        (rule) =>
          (rule.kind === edge.label ||
            (rule.kind === "imports" && edge.label === "re_exports")) &&
          pathMatches(from, rule.from) &&
          pathMatches(to, rule.to),
      )
      .map((rule) => ({
        name: rule.name,
        source,
        target,
        evidence: edge.evidence,
      }));
  });
  return {
    addedNodes,
    removedNodes,
    addedEdges,
    removedEdges,
    violations,
    marked: new Set([
      ...addedNodes.map((node) => node.id),
      ...[...addedEdges, ...removedEdges].flatMap((edge) => [
        edge.source,
        edge.target,
      ]),
      ...violations.flatMap((finding) => [
        finding.source.id,
        finding.target.id,
      ]),
    ]),
  };
}
