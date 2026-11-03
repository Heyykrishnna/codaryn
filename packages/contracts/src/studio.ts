import { z } from "zod";

export const analyzerIds = [
  "inventory",
  "typescript",
  "react",
  "api",
  "schema",
  "infrastructure",
  "testing",
  "security",
] as const;
export const analyzerIdSchema = z.enum(analyzerIds);
export type AnalyzerId = z.infer<typeof analyzerIdSchema>;
export type AnalyzerDescriptor = {
  id: AnalyzerId;
  version: string;
  category:
    "foundation" | "frontend" | "backend" | "database" | "infrastructure";
  description: string;
  fileTypes: string[];
  frameworks: string[];
  dependencies: AnalyzerId[];
  resource: "low" | "medium" | "high";
  configurationSchema: { type: "object"; additionalProperties: false };
};
const declarations: Omit<
  AnalyzerDescriptor,
  "version" | "configurationSchema"
>[] = [
  {
    id: "inventory",
    category: "foundation",
    description: "File inventory and package boundaries.",
    fileTypes: ["*"],
    frameworks: [],
    dependencies: [],
    resource: "low",
  },
  {
    id: "typescript",
    category: "foundation",
    description: "TypeScript and JavaScript syntax and module structure.",
    fileTypes: [".ts", ".tsx", ".js", ".jsx"],
    frameworks: [],
    dependencies: ["inventory"],
    resource: "medium",
  },
  {
    id: "react",
    category: "frontend",
    description: "React components, hooks and frontend relationships.",
    fileTypes: [".tsx", ".jsx"],
    frameworks: ["react"],
    dependencies: ["typescript"],
    resource: "medium",
  },
  {
    id: "api",
    category: "backend",
    description: "Backend routes, services and API contracts.",
    fileTypes: [".ts", ".js"],
    frameworks: [],
    dependencies: ["typescript"],
    resource: "medium",
  },
  {
    id: "schema",
    category: "database",
    description: "Database schemas and declared model relationships.",
    fileTypes: [".sql", ".prisma", ".ts"],
    frameworks: [],
    dependencies: ["inventory"],
    resource: "medium",
  },
  {
    id: "infrastructure",
    category: "infrastructure",
    description: "Containers, CI pipelines and deployment configuration.",
    fileTypes: [".yml", ".yaml", "Dockerfile"],
    frameworks: [],
    dependencies: ["inventory"],
    resource: "low",
  },
  {
    id: "testing",
    category: "infrastructure",
    description: "Test structure and declared test dependencies.",
    fileTypes: [".ts", ".js"],
    frameworks: [],
    dependencies: ["typescript"],
    resource: "medium",
  },
  {
    id: "security",
    category: "infrastructure",
    description: "Static trust boundaries and security configuration.",
    fileTypes: [".ts", ".js", ".yml"],
    frameworks: [],
    dependencies: ["typescript", "infrastructure"],
    resource: "high",
  },
];
export const analyzerRegistry: AnalyzerDescriptor[] = declarations.map(
  (item) => ({
    ...item,
    version: "1.0.0",
    configurationSchema: { type: "object", additionalProperties: false },
  }),
);
export const registryVersion = "1.0.0";
export const diagramIds = [
  "architecture",
  "dependencies",
  "schema",
  "dataflow",
] as const;
export const documentIds = [
  "overview",
  "api-reference",
  "schema-reference",
  "security-report",
] as const;
const exclusion = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("\\") &&
      !value.includes(":") &&
      !value.split("/").includes("..") &&
      !/[\x00-\x1f]/.test(value),
    "Exclusions must be repository-relative globs without traversal",
  );
export const studioConfigurationSchema = z.strictObject({
  version: z.literal(1),
  depth: z.enum(["overview", "standard", "deep"]),
  analyzers: z.array(analyzerIdSchema).min(1).max(32),
  includeTests: z.boolean(),
  excludeGenerated: z.boolean(),
  exclusions: z.array(exclusion).max(100),
  diagrams: z.array(z.enum(diagramIds)).max(16),
  documents: z.array(z.enum(documentIds)).max(16),
});
export type StudioConfiguration = z.infer<typeof studioConfigurationSchema>;
export const studioDefaults: StudioConfiguration = {
  version: 1,
  depth: "standard",
  analyzers: ["inventory", "typescript"],
  includeTests: false,
  excludeGenerated: true,
  exclusions: [],
  diagrams: ["architecture"],
  documents: ["overview"],
};
export const studioPresets: {
  name: string;
  configuration: StudioConfiguration;
}[] = [
  { name: "Recommended", configuration: studioDefaults },
  {
    name: "Frontend",
    configuration: { ...studioDefaults, analyzers: ["react"] },
  },
  {
    name: "Backend and data",
    configuration: {
      ...studioDefaults,
      analyzers: ["api", "schema"],
      diagrams: ["architecture", "schema"],
      documents: ["overview", "api-reference", "schema-reference"],
    },
  },
  {
    name: "Security review",
    configuration: {
      ...studioDefaults,
      depth: "deep",
      analyzers: ["security", "testing"],
      includeTests: true,
      documents: ["security-report"],
    },
  },
];
const unique = <T extends string>(values: T[]): T[] =>
  [...new Set(values)].sort((a, b) => a.localeCompare(b));
export class StudioConfigurationError extends Error {}
export function normalizeStudioConfiguration(
  input: unknown,
): StudioConfiguration {
  const config = studioConfigurationSchema.parse(input);
  if (config.depth !== "deep" && config.diagrams.includes("dataflow"))
    throw new StudioConfigurationError(
      "Data-flow diagrams require deep analysis",
    );
  const selected = new Set<AnalyzerId>([...config.analyzers, "inventory"]);
  if (
    config.diagrams.includes("schema") ||
    config.documents.includes("schema-reference")
  )
    selected.add("schema");
  if (
    config.diagrams.includes("dependencies") ||
    config.diagrams.includes("dataflow")
  )
    selected.add("typescript");
  if (config.documents.includes("api-reference")) selected.add("api");
  if (config.documents.includes("security-report")) selected.add("security");
  if (selected.has("testing") && !config.includeTests)
    throw new StudioConfigurationError(
      "The testing analyzer requires Include test files",
    );
  const addDependencies = (id: AnalyzerId) => {
    for (const dependency of analyzerRegistry.find((item) => item.id === id)
      ?.dependencies ?? []) {
      if (!selected.has(dependency)) {
        selected.add(dependency);
        addDependencies(dependency);
      }
    }
  };
  for (const id of selected) addDependencies(id);
  return {
    version: 1,
    depth: config.depth,
    analyzers: unique([...selected]),
    includeTests: config.includeTests,
    excludeGenerated: config.excludeGenerated,
    exclusions: unique(config.exclusions),
    diagrams: unique(config.diagrams),
    documents: unique(config.documents),
  };
}
export const studioProfileSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  revision: z.number().int(),
  configuration: studioConfigurationSchema,
});
export const studioProfileListSchema = z.object({
  profiles: z.array(studioProfileSchema),
});
export const studioManifestSchema = z.object({
  version: z.literal(1),
  registryVersion: z.string(),
  repositoryId: z.uuid(),
  commitSha: z.string().regex(/^[a-f0-9]{40}$/),
  configuration: studioConfigurationSchema,
  analyzers: z.array(z.object({ id: analyzerIdSchema, version: z.string() })),
});
export const studioManifestResponseSchema = z.object({
  id: z.uuid(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.literal("configured"),
  manifest: studioManifestSchema,
});
export type StudioManifestResponse = z.infer<
  typeof studioManifestResponseSchema
>;
