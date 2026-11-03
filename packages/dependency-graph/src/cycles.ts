import crypto from "node:crypto";
import type { DependencyCycle } from "@codaryn/contracts";

export function detectDependencyCycles(
  jobId: string,
  adjacencyList: ReadonlyMap<string, readonly string[]>,
  nodePathMap: ReadonlyMap<string, string>,
): DependencyCycle[] {
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const neighbors = adjacencyList.get(v) ?? [];
    for (const w of neighbors) {
      if (!indices.has(w)) {
        strongConnect(w);
        const lowV = lowlinks.get(v)!;
        const lowW = lowlinks.get(w)!;
        lowlinks.set(v, Math.min(lowV, lowW));
      } else if (onStack.has(w)) {
        const lowV = lowlinks.get(v)!;
        const idxW = indices.get(w)!;
        lowlinks.set(v, Math.min(lowV, idxW));
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);

      if (
        component.length > 1 ||
        (neighbors.includes(v) && component.length === 1)
      ) {
        sccs.push(component);
      }
    }
  }

  for (const node of adjacencyList.keys()) {
    if (!indices.has(node)) {
      strongConnect(node);
    }
  }

  const cycles: DependencyCycle[] = [];

  for (const scc of sccs) {
    const sccSet = new Set(scc);
    const startNode = scc[0]!;
    const path: string[] = [];
    const visited = new Set<string>();

    function findCyclePath(curr: string, target: string): boolean {
      path.push(curr);
      visited.add(curr);

      const neighbors = adjacencyList.get(curr) ?? [];
      for (const nxt of neighbors) {
        if (!sccSet.has(nxt)) continue;
        if (nxt === target && path.length > 1) {
          path.push(target);
          return true;
        }
        if (!visited.has(nxt)) {
          if (findCyclePath(nxt, target)) return true;
        }
      }

      path.pop();
      return false;
    }

    const hasPath = findCyclePath(startNode, startNode);
    const finalNodeIds = [...scc].sort((a, b) => a.localeCompare(b));
    const cyclePaths = hasPath
      ? path.map((id) => nodePathMap.get(id) ?? id)
      : scc.map((id) => nodePathMap.get(id) ?? id);

    const hash = crypto
      .createHash("sha256")
      .update(finalNodeIds.join(","))
      .digest("hex")
      .slice(0, 16);

    cycles.push({
      id: `cycle:${hash}`,
      jobId,
      length: scc.length,
      nodeIds: finalNodeIds,
      path: cyclePaths,
    });
  }

  return cycles.sort((a, b) => a.id.localeCompare(b.id));
}
