import type { Pool } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { runOneArtifactRequest } from "@codaryn/artifact-worker";
import { extractExecution } from "@codaryn/execution-analyzer";
export function runOneExecutionRequest(pool: Pool, github: GitHubGateway) {
  return runOneArtifactRequest(pool, github, {
    kind: "execution",
    extract(files) {
      const result = extractExecution(files);
      return { ...result, count: result.snapshot.functions.length };
    },
  });
}
