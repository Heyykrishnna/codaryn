import ts from "typescript";
import { z } from "zod";
import { resolveModule } from "@codaryn/module-resolver";
import {
  versionSnapshotSchema,
  type VersionSnapshot,
} from "@codaryn/contracts";
import { analyzeFile, digest, sourceInputs, validArtifact } from "./file.js";
import { schemaProjection } from "./schema.js";
export const analyzerVersion = `modules-schema-v1:typescript-${ts.version}`;
function options(files: Record<string, string>) {
  try {
    const source = files["tsconfig.json"];
    if (!source) return {};
    const parsed: unknown = ts.parseConfigFileTextToJson(
      "tsconfig.json",
      source,
    ).config;
    const result = z
      .object({
        compilerOptions: z
          .object({
            baseUrl: z.string().max(1024).optional(),
            paths: z
              .record(z.string(), z.array(z.string().max(1024)).max(20))
              .optional(),
          })
          .optional(),
      })
      .parse(parsed);
    return result.compilerOptions ?? {};
  } catch {
    return {};
  }
}
export function semanticVersion(snapshot: VersionSnapshot) {
  return {
    version: snapshot.version,
    analyzer: snapshot.analyzer,
    compatibility: snapshot.compatibility,
    files: snapshot.files,
    edges: snapshot.edges,
    schema: snapshot.schema,
    schemaDiagnostics: snapshot.schemaDiagnostics,
  };
}
function extract(
  files: Record<string, string>,
  previous: VersionSnapshot | null,
  version: string,
) {
  const entries = sourceInputs(files),
    compatibility = digest([
      version,
      entries
        .filter(([path]) => !/\.(?:[cm]?[jt]sx?|sql|prisma)$/.test(path))
        .map(([path, s]) => [path, digest(s)]),
    ]),
    compatible =
      previous?.compatibility === compatibility &&
      previous.analyzer === version;
  const cached = new Map(
    compatible ? previous.files.map((file) => [file.path, file]) : [],
  );
  let reused = 0,
    processed = 0;
  const artifacts = entries.map(([path, source]) => {
    const cache = cached.get(path);
    if (cache && cache.hash === digest(source) && validArtifact(cache)) {
      reused++;
      return cache;
    }
    processed++;
    return analyzeFile(path, source);
  });
  const paths = new Set(artifacts.map((file) => file.path)),
    resolver = options(files),
    edges: VersionSnapshot["edges"] = [];
  for (const file of artifacts)
    for (const item of file.imports) {
      const resolved = resolveModule(
        item.specifier,
        file.path,
        paths,
        resolver,
      );
      edges.push({
        id: digest([file.path, item.specifier, item.evidence.startLine]),
        source: file.path,
        target: resolved.resolvedPath,
        specifier: item.specifier,
        resolution: resolved.resolvedPath
          ? "resolved"
          : resolved.isExternal
            ? "external"
            : "unresolved",
        evidence: item.evidence,
      });
    }
  const allUnchanged =
    compatible &&
    reused === artifacts.length &&
    artifacts.length === previous.files.length;
  const schema = allUnchanged
    ? { schema: previous.schema, schemaDiagnostics: previous.schemaDiagnostics }
    : schemaProjection(files);
  const semantic = {
    version: 1 as const,
    analyzer: version,
    compatibility,
    files: artifacts,
    edges: edges.sort((a, b) => a.id.localeCompare(b.id)),
    ...schema,
  };
  return versionSnapshotSchema.parse({
    ...semantic,
    contentHash: digest(semantic),
    reuse: {
      reused,
      processed,
      invalidated: !!previous && !compatible,
      verification: "not-requested",
    },
  });
}
export function extractVersion(
  files: Record<string, string>,
  previous: unknown = null,
  verifyFull = false,
  version = analyzerVersion,
) {
  const parsed = versionSnapshotSchema.safeParse(previous),
    baseline = parsed.success ? parsed.data : null;
  let snapshot = extract(files, baseline, version);
  if (verifyFull) {
    const full = extract(files, null, version);
    if (full.contentHash !== snapshot.contentHash) {
      snapshot = {
        ...full,
        reuse: { ...full.reuse, verification: "fallback-full" },
      };
    } else
      snapshot = {
        ...snapshot,
        reuse: { ...snapshot.reuse, verification: "matched" },
      };
  }
  return { snapshot, hash: digest(snapshot) };
}
