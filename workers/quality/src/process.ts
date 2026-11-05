import type { Pool } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { runOneArtifactRequest } from "@codaryn/artifact-worker";
import {
  extractQuality,
  canonicalQuality,
} from "@codaryn/engineering-analyzer";
import { runConfiguredScanners, type ScannerOptions } from "./scanners.js";
export function runOneQualityRequest(
  pool: Pool,
  github: GitHubGateway,
  options: ScannerOptions,
) {
  return runOneArtifactRequest(pool, github, {
    kind: "quality",
    accept: (path) =>
      /\.(?:[cm]?[jt]sx?|json|ya?ml|py|sh|txt|lcov|info)$/.test(path) ||
      /(^|\/)(?:Dockerfile(?:\.|$)|\.env(?:\.|$))/.test(path),
    async extract(files, external) {
      const result = extractQuality(files);
      await runConfiguredScanners(files, result.snapshot, external, options);
      const canonical = canonicalQuality(result.snapshot);
      return { ...canonical, count: canonical.snapshot.findings.length };
    },
  });
}
