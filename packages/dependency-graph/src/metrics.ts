import type { ModuleCouplingMetric } from "@codaryn/contracts";

export function calculateModuleMetrics(
  jobId: string,
  allPaths: readonly string[],
  outgoingMap: ReadonlyMap<string, ReadonlySet<string>>,
  incomingMap: ReadonlyMap<string, ReadonlySet<string>>,
): ModuleCouplingMetric[] {
  const depthCache = new Map<string, number>();

  function calculateDepth(p: string, visited: Set<string>): number {
    if (depthCache.has(p)) return depthCache.get(p)!;
    if (visited.has(p)) return 0;

    visited.add(p);
    const outgoing = outgoingMap.get(p);
    if (!outgoing || outgoing.size === 0) {
      depthCache.set(p, 0);
      return 0;
    }

    let maxChildDepth = 0;
    for (const target of outgoing) {
      if (target !== p) {
        const d = calculateDepth(target, new Set(visited));
        if (d + 1 > maxChildDepth) {
          maxChildDepth = d + 1;
        }
      }
    }

    depthCache.set(p, maxChildDepth);
    return maxChildDepth;
  }

  const metrics: ModuleCouplingMetric[] = [];

  for (const path of allPaths) {
    const afferent = incomingMap.get(path)?.size ?? 0;
    const efferent = outgoingMap.get(path)?.size ?? 0;
    const total = afferent + efferent;
    const instability = total === 0 ? 0 : efferent / total;
    const depth = calculateDepth(path, new Set());

    metrics.push({
      jobId,
      path,
      afferentCoupling: afferent,
      efferentCoupling: efferent,
      instability: Number(instability.toFixed(4)),
      depth,
    });
  }

  return metrics.sort((a, b) => a.path.localeCompare(b.path));
}
