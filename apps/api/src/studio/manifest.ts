import { createHash } from "node:crypto";
import {
  analyzerRegistry,
  normalizeStudioConfiguration,
  registryVersion,
  studioManifestSchema,
} from "@codaryn/contracts";
export function createManifest(
  repositoryId: string,
  commitSha: string,
  input: unknown,
) {
  const configuration = normalizeStudioConfiguration(input);
  const manifest = studioManifestSchema.parse({
    version: 1,
    registryVersion,
    repositoryId,
    commitSha,
    configuration,
    analyzers: configuration.analyzers.map((id) => {
      const descriptor = analyzerRegistry.find((item) => item.id === id);
      if (!descriptor) throw new Error("Analyzer registry is inconsistent");
      return { id, version: descriptor.version };
    }),
  });
  const hash = createHash("sha256")
    .update(JSON.stringify(manifest))
    .digest("hex");
  return { manifest, hash };
}
