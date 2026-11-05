import type { ExecutionSnapshot } from "@codaryn/contracts";
export function executionPaths(
  snapshot: ExecutionSnapshot,
  from: string,
  to: string,
  depth = 6,
) {
  if (depth < 1 || depth > 12) throw new Error("Path depth out of range");
  const adjacency = new Map<string, string[]>();
  for (const call of snapshot.calls)
    if (call.targetId && call.kind !== "callback")
      adjacency.set(call.sourceId, [
        ...new Set([...(adjacency.get(call.sourceId) ?? []), call.targetId]),
      ]);
  const queue: string[][] = [[from]],
    paths: string[][] = [];
  let visited = 0,
    truncated = false;
  while (queue.length) {
    if (visited >= 5000 || paths.length >= 20) {
      truncated = true;
      break;
    }
    const path = queue.shift()!;
    visited++;
    const current = path.at(-1)!;
    if (current === to) {
      paths.push(path);
      continue;
    }
    const next = adjacency.get(current) ?? [];
    if (path.length > depth) {
      if (next.some((id) => !path.includes(id))) truncated = true;
      continue;
    }
    for (const id of next)
      if (!path.includes(id)) {
        if (queue.length >= 5000) {
          truncated = true;
          break;
        }
        queue.push([...path, id]);
      }
  }
  return { paths, truncated, visited, semantics: "potential-static" as const };
}
export function executionNeighborhood(
  snapshot: ExecutionSnapshot,
  id: string,
  depth = 1,
) {
  if (depth < 1 || depth > 3)
    throw new Error("Neighborhood depth out of range");
  const ids = new Set([id]);
  let truncated = false;
  for (let step = 0; step < depth; step++) {
    const current = new Set(ids);
    for (const call of snapshot.calls) {
      if (
        !call.targetId ||
        (!current.has(call.sourceId) && !current.has(call.targetId))
      )
        continue;
      if (ids.size >= 200) {
        truncated = true;
        break;
      }
      ids.add(call.sourceId);
      ids.add(call.targetId);
    }
  }
  return {
    functions: snapshot.functions.filter((f) => ids.has(f.id)),
    calls: snapshot.calls
      .filter(
        (c) => ids.has(c.sourceId) && (!c.targetId || ids.has(c.targetId)),
      )
      .slice(0, 500),
    truncated,
  };
}
