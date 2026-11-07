import type { AnalysisSnapshotInput } from "@codaryn/diagram-engine";
import type {
  ArchitectureAtlas,
  AtlasEdge,
  AtlasGraph,
  AtlasNode,
} from "@codaryn/contracts";
import { createHash } from "node:crypto";

const nodeLimit = 160;
const edgeLimit = 320;
const unitGroups = new Map([
  ["apps", "Applications"],
  ["services", "Services"],
  ["workers", "Background workers"],
  ["packages", "Shared packages"],
  ["libs", "Shared libraries"],
  ["functions", "Function directories"],
  ["cmd", "Commands"],
]);

function identity(...parts: string[]) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

const manifests =
  /(?:^|\/)(?:package\.json|go\.(?:mod|work)|Cargo\.toml|pom\.xml|build\.gradle(?:\.kts)?|Gemfile|composer\.json|Package\.swift|pubspec\.yaml|[^/]+\.csproj|serverless\.ya?ml|cdk\.json|samconfig\.toml)$/;

function repositoryGroups(input: AnalysisSnapshotInput) {
  const roots = new Set(
    (input.dependencies?.nodes ?? [])
      .filter((node) => !node.isExternal && manifests.test(node.path))
      .map((node) => node.path.split("/").slice(0, -1).join("/"))
      .filter(Boolean),
  );
  return (path: string) => {
    const parts = path.split("/");
    const command = parts.lastIndexOf("cmd");
    if (path.endsWith(".go") && command >= 0 && command + 2 < parts.length) {
      return parts.slice(0, command + 2).join("/");
    }
    for (let index = parts.length - 1; index > 0; index--) {
      const prefix = parts.slice(0, index).join("/");
      if (roots.has(prefix)) return prefix;
    }
    return parts.length > 2 &&
      ["apps", "packages", "services", "workers", "libs", "functions"].includes(
        parts[0],
      )
      ? parts.slice(0, 2).join("/")
      : "Repository root";
  };
}

function featureGroup(path: string, root: string) {
  const directory = path.split("/").at(-2);
  return directory && directory !== root.split("/").at(-1)
    ? `${root} / ${directory}`
    : root;
}

function boundedGraph(nodes: AtlasNode[], edges: AtlasEdge[]): AtlasGraph {
  const visible = nodes.slice(0, nodeLimit);
  const ids = new Set(visible.map((node) => node.id));
  const connected = edges.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );
  return {
    nodes: visible,
    edges: connected.slice(0, edgeLimit),
    truncated: nodes.length > nodeLimit || connected.length > edgeLimit,
  };
}

function buildDependencies(
  input: AnalysisSnapshotInput,
  packageRoot: (path: string) => string,
) {
  const ids = new Map<string, AtlasNode>();
  for (const node of input.dependencies?.nodes ?? []) {
    ids.set(node.id, {
      id: identity("file", node.path, String(node.isExternal ?? false)),
      title: node.name,
      kind: node.isExternal ? "External package" : "File",
      group: node.isExternal ? "External packages" : packageRoot(node.path),
      path: node.path,
    });
  }
  const degree = new Map<string, number>();
  const incoming = new Map<string, number>();
  const files: AtlasEdge[] = [];
  const serviceEdges = new Map<string, AtlasEdge & { count: number }>();
  for (const edge of input.dependencies?.edges ?? []) {
    const source = ids.get(edge.sourceId);
    const target = ids.get(edge.targetId);
    if (!source || !target) continue;
    files.push({
      source: source.id,
      target: target.id,
      label: edge.kind,
      status: edge.status,
      evidence: edge.evidence,
    });
    for (const node of [source, target])
      degree.set(node.id, (degree.get(node.id) ?? 0) + 1);
    if (
      ["imports", "re_exports"].includes(edge.kind) &&
      source.group !== "External packages"
    ) {
      incoming.set(
        target.path ?? "",
        (incoming.get(target.path ?? "") ?? 0) + 1,
      );
      if (source.group === target.group || target.group === "External packages")
        continue;
      const key = identity(source.group, target.group, edge.status);
      const previous = serviceEdges.get(key);
      if (previous) previous.count++;
      else
        serviceEdges.set(key, {
          source: identity("unit", source.group),
          target: identity("unit", target.group),
          status: edge.status,
          evidence: edge.evidence,
          label: "",
          count: 1,
        });
    }
  }
  const units = new Map<string, number>();
  for (const node of ids.values()) {
    if (node.kind === "File")
      units.set(node.group, (units.get(node.group) ?? 0) + 1);
  }
  const serviceNodes = [...units].map(([group, count]) => ({
    id: identity("unit", group),
    title: group,
    group: unitGroups.get(group.split("/")[0]) ?? "Repository units",
    kind: `${count} indexed files`,
    path: group === "Repository root" ? undefined : group,
  }));
  const fileNodes = [...ids.values()].sort(
    (a, b) =>
      (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
      a.title.localeCompare(b.title),
  );
  return {
    incoming,
    services: boundedGraph(
      serviceNodes,
      [...serviceEdges.values()].map(({ count, ...edge }) => ({
        ...edge,
        label: `${count} import links`,
      })),
    ),
    files: boundedGraph(fileNodes, files),
  };
}

function buildFeatures(
  input: AnalysisSnapshotInput,
  packageRoot: (path: string) => string,
) {
  const lookup = new Map<string, AtlasNode>();
  for (const component of input.frontend?.components ?? []) {
    lookup.set(component.id, {
      id: identity("component", component.filePath, component.name),
      title: component.name,
      kind: component.isPage ? "Page" : "Component",
      group: featureGroup(component.filePath, packageRoot(component.filePath)),
      path: component.filePath,
      evidence: {
        path: component.filePath,
        startLine: component.startLine,
        endLine: component.endLine,
      },
    });
  }
  for (const route of input.backend?.routes ?? []) {
    lookup.set(
      route.id,
      routeNode(
        route,
        featureGroup(route.filePath, packageRoot(route.filePath)),
      ),
    );
  }
  const edges = (input.frontend?.connections ?? []).flatMap((connection) => {
    const source = lookup.get(connection.sourceId);
    const target = lookup.get(connection.targetId);
    return source && target
      ? [
          {
            source: source.id,
            target: target.id,
            label: connection.kind,
            status: connection.status,
            evidence: connection.evidence,
          },
        ]
      : [];
  });
  const represented = new Set([...lookup.values()].map((node) => node.group));
  for (const file of input.dependencies?.nodes ?? []) {
    if (file.isExternal || manifests.test(file.path)) continue;
    const group = featureGroup(file.path, packageRoot(file.path));
    if (represented.has(group)) continue;
    represented.add(group);
    const folder = file.path.split("/").slice(0, -1).join("/");
    const id = identity("feature-folder", folder);
    lookup.set(id, {
      id,
      title: folder || "Root files",
      kind: "Source folder",
      group,
      path: folder || file.path,
    });
  }
  return boundedGraph(
    [...new Map([...lookup.values()].map((node) => [node.id, node])).values()],
    edges,
  );
}

type Route = NonNullable<AnalysisSnapshotInput["backend"]>["routes"][number];

function routeNode(route: Route, group: string): AtlasNode {
  return {
    id: identity(
      "route",
      route.method,
      route.path,
      route.filePath,
      route.handler ?? "",
    ),
    title: `${route.method} ${route.path}`,
    kind: "Endpoint",
    group,
    path: route.filePath,
    evidence: {
      path: route.filePath,
      startLine: route.startLine,
      endLine: route.endLine,
    },
  };
}

function buildSequences(
  input: AnalysisSnapshotInput,
  incoming: Map<string, number>,
) {
  const routes = [...(input.backend?.routes ?? [])].sort(
    (a, b) =>
      (incoming.get(b.filePath) ?? 0) - (incoming.get(a.filePath) ?? 0) ||
      a.path.localeCompare(b.path) ||
      a.method.localeCompare(b.method),
  );
  const nodes: AtlasNode[] = [];
  const edges: AtlasEdge[] = [];
  const seen = new Set<string>();
  const tour: ArchitectureAtlas["tour"] = [];
  for (const route of routes) {
    const root = routeNode(
      route,
      `${route.method} ${route.path} · ${route.filePath}`,
    );
    if (seen.has(root.id)) continue;
    seen.add(root.id);
    nodes.push(root);
    if (
      tour.length < 12 &&
      !/(^|\/)(tests?|__tests__|migrations?)(\/|$)|\.(test|spec)\./i.test(
        route.filePath,
      )
    ) {
      tour.push({
        nodeId: root.id,
        incomingImports: incoming.get(route.filePath) ?? 0,
      });
    }
    const participants = [
      ...(route.middleware ?? []).map((name) => ({ name, kind: "Middleware" })),
      ...(route.handler ? [{ name: route.handler, kind: "Handler" }] : []),
    ];
    let previous = root.id;
    participants.forEach(({ name, kind }, index) => {
      const id = identity(root.id, String(index), kind, name);
      nodes.push({ ...root, id, title: name, kind });
      edges.push({
        source: previous,
        target: id,
        label: "Declared order",
        status: "DIRECT",
        evidence: root.evidence,
      });
      previous = id;
    });
  }
  const graph = boundedGraph(nodes, edges);
  const visible = new Set(graph.nodes.map((node) => node.id));
  return { graph, tour: tour.filter((stop) => visible.has(stop.nodeId)) };
}

function buildFunctionFlows(input: AnalysisSnapshotInput) {
  const execution = input.execution;
  if (!execution) return boundedGraph([], []);
  const functions = new Map(execution.functions.map((fn) => [fn.id, fn]));
  const nodes = new Map<string, AtlasNode>();
  for (const block of execution.controlNodes ?? []) {
    const fn = functions.get(block.functionId);
    if (!fn) continue;
    nodes.set(block.id, {
      id: identity(
        "flow",
        fn.filePath,
        fn.name,
        String(fn.startLine),
        block.id,
      ),
      title: block.label || block.kind,
      kind: block.kind,
      group: `${fn.name} · ${fn.filePath}:${fn.startLine}`,
      path: block.evidence.path,
      evidence: block.evidence,
    });
  }
  const edges = (execution.controlEdges ?? []).flatMap((edge): AtlasEdge[] => {
    const source = nodes.get(edge.sourceId);
    const target = nodes.get(edge.targetId);
    return source && target
      ? [
          {
            source: source.id,
            target: target.id,
            label: edge.label || "Continues",
            status: "DIRECT",
            evidence: source.evidence,
          },
        ]
      : [];
  });
  const callNodes = new Map<string, AtlasNode>();
  const calls = execution.calls.slice(0, 160).flatMap((call): AtlasEdge[] => {
    const from = functions.get(call.callerId);
    const to = functions.get(call.calleeId);
    if (!from || !to) return [];
    const nodeFor = (fn: typeof from): AtlasNode => ({
      id: identity("function", fn.filePath, fn.name, String(fn.startLine)),
      title: fn.name,
      kind: "Function",
      group: "Cross-function calls",
      path: fn.filePath,
      evidence: {
        path: fn.filePath,
        startLine: fn.startLine,
        endLine: fn.endLine,
      },
    });
    const source = nodeFor(from);
    const target = nodeFor(to);
    callNodes.set(source.id, source);
    callNodes.set(target.id, target);
    return [
      {
        source: source.id,
        target: target.id,
        label: "calls",
        status: call.status,
        evidence: call.evidence,
      },
    ];
  });
  const boundedCalls = [...callNodes.values()].slice(0, 40);
  const result = boundedGraph(
    [...nodes.values()]
      .slice(0, nodeLimit - boundedCalls.length)
      .concat(boundedCalls),
    [...calls, ...edges],
  );
  return {
    ...result,
    truncated:
      result.truncated ||
      nodes.size + callNodes.size > nodeLimit ||
      execution.calls.length > 160,
  };
}

export function buildAtlas(
  input: AnalysisSnapshotInput,
  health: ArchitectureAtlas["health"],
): ArchitectureAtlas {
  const packageRoot = repositoryGroups(input);
  const dependencies = buildDependencies(input, packageRoot);
  const sequences = buildSequences(input, dependencies.incoming);
  return {
    jobId: input.jobId,
    repositoryName: input.repositoryName,
    commitSha: input.commitSha,
    health,
    executionReady: !!input.execution,
    tour: sequences.tour,
    layers: {
      services: dependencies.services,
      features: buildFeatures(input, packageRoot),
      sequences: sequences.graph,
      files: dependencies.files,
      functions: buildFunctionFlows(input),
    },
  };
}
