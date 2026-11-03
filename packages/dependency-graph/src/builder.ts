import crypto from "node:crypto";
import type {
  DependencyCycle,
  DependencyEdge,
  DependencyNode,
  GraphSnapshotResponse,
  ModuleCouplingMetric,
  ResolvedSymbolReference,
} from "@codaryn/contracts";
import { detectDependencyCycles } from "./cycles.js";
import { calculateModuleMetrics } from "./metrics.js";

export interface FileMetadataInput {
  readonly path: string;
  readonly language?: string;
  readonly linesOfCode?: number;
}

export class DependencyGraphBuilder {
  private readonly nodes = new Map<string, DependencyNode>();
  private readonly edges = new Map<string, DependencyEdge>();
  private readonly outgoing = new Map<string, Set<string>>();
  private readonly incoming = new Map<string, Set<string>>();
  private readonly nodePathMap = new Map<string, string>();
  private readonly filePaths = new Set<string>();

  constructor(
    private readonly jobId: string,
    files: readonly FileMetadataInput[],
  ) {
    for (const f of files) {
      const id = `node:file:${f.path}`;
      const name = f.path.split("/").pop() ?? f.path;
      const node: DependencyNode = {
        id,
        jobId: this.jobId,
        kind: "file",
        path: f.path,
        name,
        language: f.language,
        linesOfCode: f.linesOfCode,
      };
      this.nodes.set(id, node);
      this.nodePathMap.set(id, f.path);
      this.filePaths.add(f.path);
    }
  }

  public addReferences(references: readonly ResolvedSymbolReference[]): this {
    for (const ref of references) {
      const sourceNodeId = `node:file:${ref.sourceFile}`;

      if (ref.status === "external") {
        const extNodeId = `node:ext:${ref.moduleSpecifier}`;
        if (!this.nodes.has(extNodeId)) {
          this.nodes.set(extNodeId, {
            id: extNodeId,
            jobId: this.jobId,
            kind: "external",
            path: ref.moduleSpecifier,
            name: ref.moduleSpecifier,
          });
          this.nodePathMap.set(extNodeId, ref.moduleSpecifier);
        }

        const edgeId = this.generateEdgeId(sourceNodeId, extNodeId, "imports");
        this.edges.set(edgeId, {
          id: edgeId,
          jobId: this.jobId,
          sourceId: sourceNodeId,
          targetId: extNodeId,
          kind: "imports",
          resolution: "DIRECT",
          evidence: [ref.evidence],
          weight: 1,
        });
        continue;
      }

      if (ref.status === "resolved" && ref.targetFile) {
        const targetNodeId = `node:file:${ref.targetFile}`;
        if (!this.nodes.has(targetNodeId)) {
          const name = ref.targetFile.split("/").pop() ?? ref.targetFile;
          this.nodes.set(targetNodeId, {
            id: targetNodeId,
            jobId: this.jobId,
            kind: "file",
            path: ref.targetFile,
            name,
          });
          this.nodePathMap.set(targetNodeId, ref.targetFile);
          this.filePaths.add(ref.targetFile);
        }

        const edgeId = this.generateEdgeId(
          sourceNodeId,
          targetNodeId,
          "imports",
        );
        const existing = this.edges.get(edgeId);

        if (existing) {
          const evidencePaths = new Set(
            existing.evidence.map(
              (e) => `${e.path}:${e.startLine}-${e.endLine}`,
            ),
          );
          const currentKey = `${ref.evidence.path}:${ref.evidence.startLine}-${ref.evidence.endLine}`;
          const nextEvidence = evidencePaths.has(currentKey)
            ? existing.evidence
            : [...existing.evidence, ref.evidence];

          this.edges.set(edgeId, {
            ...existing,
            weight: existing.weight + 1,
            evidence: nextEvidence,
          });
        } else {
          this.edges.set(edgeId, {
            id: edgeId,
            jobId: this.jobId,
            sourceId: sourceNodeId,
            targetId: targetNodeId,
            kind: "imports",
            resolution: "RESOLVED",
            evidence: [ref.evidence],
            weight: 1,
          });
        }

        if (!this.outgoing.has(ref.sourceFile)) {
          this.outgoing.set(ref.sourceFile, new Set());
        }
        this.outgoing.get(ref.sourceFile)!.add(ref.targetFile);

        if (!this.incoming.has(ref.targetFile)) {
          this.incoming.set(ref.targetFile, new Set());
        }
        this.incoming.get(ref.targetFile)!.add(ref.sourceFile);
      }
    }

    return this;
  }

  public buildSnapshot(): GraphSnapshotResponse {
    const nodes = [...this.nodes.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );
    const edges = [...this.edges.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    );

    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (!adjacency.has(edge.sourceId)) {
        adjacency.set(edge.sourceId, []);
      }
      adjacency.get(edge.sourceId)!.push(edge.targetId);
    }

    const cycles: DependencyCycle[] = detectDependencyCycles(
      this.jobId,
      adjacency,
      this.nodePathMap,
    );

    const metrics: ModuleCouplingMetric[] = calculateModuleMetrics(
      this.jobId,
      [...this.filePaths].sort((a, b) => a.localeCompare(b)),
      this.outgoing,
      this.incoming,
    );

    return {
      jobId: this.jobId,
      nodes,
      edges,
      cycles,
      metrics,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalCycles: cycles.length,
    };
  }

  public getNeighborhood(
    centerNodeId: string,
    depth: number = 1,
    direction: "incoming" | "outgoing" | "both" = "both",
  ): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
    const matchedNodeIds = new Set<string>();
    const matchedEdgeIds = new Set<string>();
    const queue: Array<{ id: string; currentDepth: number }> = [
      { id: centerNodeId, currentDepth: 0 },
    ];
    matchedNodeIds.add(centerNodeId);

    const allEdges = [...this.edges.values()];

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift()!;
      if (currentDepth >= depth) continue;

      for (const edge of allEdges) {
        if (
          (direction === "outgoing" || direction === "both") &&
          edge.sourceId === id
        ) {
          matchedEdgeIds.add(edge.id);
          if (!matchedNodeIds.has(edge.targetId)) {
            matchedNodeIds.add(edge.targetId);
            queue.push({ id: edge.targetId, currentDepth: currentDepth + 1 });
          }
        }

        if (
          (direction === "incoming" || direction === "both") &&
          edge.targetId === id
        ) {
          matchedEdgeIds.add(edge.id);
          if (!matchedNodeIds.has(edge.sourceId)) {
            matchedNodeIds.add(edge.sourceId);
            queue.push({ id: edge.sourceId, currentDepth: currentDepth + 1 });
          }
        }
      }
    }

    const resultNodes = [...matchedNodeIds]
      .map((id) => this.nodes.get(id))
      .filter((n): n is DependencyNode => n !== undefined)
      .sort((a, b) => a.id.localeCompare(b.id));

    const resultEdges = [...matchedEdgeIds]
      .map((id) => this.edges.get(id))
      .filter((e): e is DependencyEdge => e !== undefined)
      .sort((a, b) => a.id.localeCompare(b.id));

    return { nodes: resultNodes, edges: resultEdges };
  }

  private generateEdgeId(
    sourceId: string,
    targetId: string,
    kind: string,
  ): string {
    const hash = crypto
      .createHash("sha256")
      .update(`${sourceId}->${targetId}:${kind}`)
      .digest("hex")
      .slice(0, 16);
    return `edge:${hash}`;
  }
}
