import type { Pool } from "pg";
import type { GitHubGateway } from "@codaryn/github";
import { runOneArtifactRequest } from "@codaryn/artifact-worker";
import { studioManifestSchema } from "@codaryn/contracts";
import { exclusionPredicate } from "@codaryn/repository-ingestion";
import {
  extractVersion,
  digest,
  analyzerVersion,
} from "@codaryn/version-engine";
export function runOneVersionRequest(pool: Pool, github: GitHubGateway) {
  return runOneArtifactRequest(pool, github, {
    kind: "version",
    accept: (path) => /\.(?:[cm]?[jt]sx?|json|sql|prisma|ya?ml)$/.test(path),
    async extract(files, verify, context) {
      const baseline = await pool.query<{ snapshot: unknown; hash: string }>(
        "SELECT b.snapshot,b.hash FROM analysis_version_snapshots s JOIN analysis_version_snapshots b ON b.id=s.base_snapshot_id AND b.organization_id=s.organization_id AND b.repository_id=s.repository_id AND b.status='completed' WHERE s.id=$1",
        [context.id],
      );
      const manifest = await pool.query<{ manifest: unknown }>(
        "SELECT m.manifest FROM analysis_jobs j JOIN analysis_manifests m ON m.id=j.manifest_id AND m.organization_id=j.organization_id AND m.repository_id=j.repository_id WHERE j.id=$1",
        [context.job_id],
      );
      const parsed = studioManifestSchema.safeParse(manifest.rows[0]?.manifest),
        configuration = parsed.success ? parsed.data.configuration : null;
      const excluded = exclusionPredicate(new Map(), {
        excludes: configuration?.exclusions,
        respectGitignore: false,
      });
      const selected = Object.fromEntries(
        Object.entries(files).filter(
          ([path, source]) =>
            !excluded(path) &&
            (configuration?.includeTests !== false ||
              !/(?:__tests__\/|\.(?:test|spec)\.)/.test(path)) &&
            (!configuration?.excludeGenerated ||
              !/@generated|automatically generated/i.test(
                source.slice(0, 512),
              )),
        ),
      );
      const version =
        "v1:" +
        digest([
          analyzerVersion,
          configuration,
          parsed.success ? parsed.data.analyzers : [],
          parsed.success ? parsed.data.registryVersion : "",
        ]);
      const result = extractVersion(
        selected,
        baseline.rows[0] &&
          digest(baseline.rows[0].snapshot) === baseline.rows[0].hash
          ? baseline.rows[0].snapshot
          : null,
        verify,
        version,
      );
      return { ...result, count: result.snapshot.files.length };
    },
    async published(client, id) {
      await client.query(
        "UPDATE analysis_jobs j SET status='completed',current_stage='completed',completed_at=now(),updated_at=now(),file_count=s.file_count FROM analysis_version_snapshots s WHERE s.id=$1 AND s.job_id=j.id AND s.trigger_key IS NOT NULL AND j.status<>'cancelled'",
        [id],
      );
    },
  });
}
