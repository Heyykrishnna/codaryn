import type {
  DiagramNode,
  DiagramEdge,
  DiagramLegendItem,
  DiagramGraph,
  DiagramType,
  SourceEvidence,
  Resolution,
  ExecutionSnapshot,
} from "@codaryn/contracts";

export interface SnapshotFrontendInput {
  components: Array<{
    id: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
    isPage?: boolean;
    routePath?: string;
  }>;
  routes: Array<{
    id: string;
    path: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  contexts: Array<{
    id: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  hooks: Array<{
    id: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  apiClients: Array<{
    id: string;
    endpoint: string;
    method: string;
    filePath: string;
    startLine: number;
    endLine: number;
    resolvedEndpointId?: string;
  }>;
  connections: Array<{
    sourceId: string;
    targetId: string;
    kind: string;
    status: Resolution;
    evidence?: SourceEvidence;
  }>;
}

export interface SnapshotBackendInput {
  routes: Array<{
    id: string;
    method: string;
    path: string;
    controllerId?: string;
    handler?: string;
    middleware?: string[];
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  controllers: Array<{
    id: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  services: Array<{
    id: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  repositories: Array<{
    id: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
    modelName?: string;
  }>;
  middleware: Array<{
    id: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  connections: Array<{
    sourceId: string;
    targetId: string;
    kind: string;
    status: Resolution;
    evidence?: SourceEvidence;
  }>;
}

export interface SnapshotSchemaInput {
  tables: Array<{
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
    columns: Array<{
      name: string;
      dataType: string;
      isPrimaryKey?: boolean;
      isNullable?: boolean;
    }>;
  }>;
  relations: Array<{
    id: string;
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
    targetColumn: string;
    cardinality: "one_to_one" | "one_to_many" | "many_to_many";
    status: Resolution;
    evidence?: SourceEvidence;
  }>;
}

export interface SnapshotDependencyInput {
  nodes: Array<{
    id: string;
    path: string;
    name: string;
    isExternal?: boolean;
    evidence?: SourceEvidence;
  }>;
  edges: Array<{
    sourceId: string;
    targetId: string;
    kind: string;
    status: Resolution;
    weight?: number;
    evidence?: SourceEvidence;
  }>;
  cycles?: Array<{
    id: string;
    nodeIds: string[];
  }>;
}

export interface SnapshotExecutionInput {
  controlNodes?: ExecutionSnapshot["controlNodes"];
  controlEdges?: ExecutionSnapshot["controlEdges"];
  functions: Array<{
    id: string;
    name: string;
    filePath: string;
    startLine: number;
    endLine: number;
    isExported?: boolean;
  }>;
  calls: Array<{
    id: string;
    callerId: string;
    calleeId: string;
    status: Resolution;
    evidence?: SourceEvidence;
  }>;
}

export interface SnapshotInfrastructureInput {
  containers: Array<{
    name: string;
    baseImage: string;
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  composeServices: Array<{
    name: string;
    image?: string;
    ports?: string[];
    dependsOn?: string[];
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
  workflows: Array<{
    name: string;
    triggers: string[];
    jobs: string[];
    filePath: string;
    startLine: number;
    endLine: number;
  }>;
}

export interface AnalysisSnapshotInput {
  jobId: string;
  commitSha: string;
  repositoryName: string;
  frontend?: SnapshotFrontendInput;
  backend?: SnapshotBackendInput;
  schema?: SnapshotSchemaInput;
  dependencies?: SnapshotDependencyInput;
  execution?: SnapshotExecutionInput;
  infrastructure?: SnapshotInfrastructureInput;
}
