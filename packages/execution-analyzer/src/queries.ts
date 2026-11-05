import type { ExecutionSnapshot } from "@codaryn/contracts";
class PathSearch {
  private readonly adjacency = new Map<string, string[]>();
  private readonly queue: string[][];
  private readonly paths: string[][] = [];
  private visited = 0;
  private truncated = false;
  constructor(
    snapshot: ExecutionSnapshot,
    from: string,
    private readonly to: string,
    private readonly depth: number,
  ) {
    this.queue = [[from]];
    for (const call of snapshot.calls)
      if (call.targetId && call.kind !== "callback")
        this.adjacency.set(call.sourceId, [
          ...new Set([
            ...(this.adjacency.get(call.sourceId) ?? []),
            call.targetId,
          ]),
        ]);
  }
  run() {
    while (this.queue.length) {
      if (this.visited >= 5000 || this.paths.length >= 20) {
        this.truncated = true;
        break;
      }
      const path = this.queue.shift()!;
      this.visited++;
      if (path.at(-1) === this.to) this.paths.push(path);
      else this.expand(path);
    }
    return {
      paths: this.paths,
      truncated: this.truncated,
      visited: this.visited,
      semantics: "potential-static" as const,
    };
  }
  private expand(path: string[]) {
    const next = this.adjacency.get(path.at(-1)!) ?? [];
    if (path.length > this.depth) {
      if (next.some((id) => !path.includes(id))) this.truncated = true;
      return;
    }
    for (const id of next) {
      if (path.includes(id)) continue;
      if (this.queue.length >= 5000) {
        this.truncated = true;
        break;
      }
      this.queue.push([...path, id]);
    }
  }
}
export function executionPaths(
  snapshot: ExecutionSnapshot,
  from: string,
  to: string,
  depth = 6,
) {
  if (depth < 1 || depth > 12) throw new Error("Path depth out of range");
  return new PathSearch(snapshot, from, to, depth).run();
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
  const calls = snapshot.calls.filter(
    (c) => ids.has(c.sourceId) && (!c.targetId || ids.has(c.targetId)),
  );
  return {
    functions: snapshot.functions.filter((f) => ids.has(f.id)),
    calls: calls.slice(0, 500),
    truncated: truncated || calls.length > 500,
  };
}
