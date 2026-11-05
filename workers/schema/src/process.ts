import type { Pool } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { runOneArtifactRequest } from "@codaryn/artifact-worker";
import { extractSchema } from "@codaryn/schema-engine";
export function runOneSchemaRequest(pool: Pool, github: GitHubGateway) {
  return runOneArtifactRequest(pool, github, {
    kind: "schema",
    extract(files, infer) {
      const result = extractSchema(files, infer);
      return { ...result, count: result.snapshot.tables.length };
    },
  });
}
