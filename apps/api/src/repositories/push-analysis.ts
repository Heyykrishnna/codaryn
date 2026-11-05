import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { z } from "zod";
import { studioManifestSchema } from "@codaryn/contracts";
import { createManifest } from "../studio/manifest.js";
import { branchRefSchema } from "@codaryn/contracts";
const pushSchema = z.object({
  installation: z.object({ id: z.number().int().positive().safe() }),
  repository: z.object({ id: z.number().int().positive().safe() }),
  after: z.string().regex(/^[a-f0-9]{40}$/),
  before: z.string().regex(/^[a-f0-9]{40}$/),
  ref: branchRefSchema,
  deleted: z.boolean().default(false),
});
export async function schedulePush(client: PoolClient, input: unknown) {
  const body = pushSchema.parse(input);
  if (body.deleted || body.after === "0".repeat(40)) return false;
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
    `push:${body.installation.id}:${body.repository.id}`,
  ]);
  const policies = await client.query<{
    repository_id: string;
    organization_id: string;
    manifest: unknown;
    actor_id: string;
    generation: number;
  }>(
    "SELECT p.repository_id,p.organization_id,p.actor_id,m.manifest,i.generation FROM repository_analysis_policies p JOIN connected_repositories r ON r.id=p.repository_id JOIN github_installations i ON i.id=r.installation_id AND i.organization_id=p.organization_id JOIN organizations o ON o.id=p.organization_id JOIN organization_members u ON u.organization_id=p.organization_id AND u.user_id=p.actor_id JOIN analysis_manifests m ON m.id=p.manifest_id AND m.organization_id=p.organization_id AND m.repository_id=p.repository_id WHERE r.github_id=$1 AND i.id=$2 AND p.ref=$3 AND p.enabled=true AND i.connected=true AND r.active=true AND o.deleted_at IS NULL AND u.role IN ('owner','admin') FOR SHARE OF p,r,i,o,u,m",
    [body.repository.id, body.installation.id, body.ref],
  );
  const policy = policies.rows[0];
  if (!policy) return false;
  const trigger = `${policy.repository_id}:${body.ref}:${body.after}`;
  if (
    (
      await client.query(
        "SELECT id FROM analysis_version_snapshots WHERE trigger_key=$1",
        [trigger],
      )
    ).rowCount
  )
    return false;
  const active = await client.query<{ count: string }>(
    "SELECT count(*) FROM analysis_version_snapshots WHERE repository_id=$1 AND status IN ('queued','running')",
    [policy.repository_id],
  );
  if (Number(active.rows[0].count) >= 100) throw new Error("WEBHOOK_CAPACITY");
  const template = studioManifestSchema.parse(policy.manifest),
    created = createManifest(
      policy.repository_id,
      body.after,
      template.configuration,
    ),
    manifestId = randomUUID(),
    jobId = randomUUID(),
    id = randomUUID();
  const base = await client.query<{ id: string }>(
    "SELECT id FROM analysis_version_snapshots WHERE organization_id=$1 AND repository_id=$2 AND commit_sha=$3 AND status='completed' ORDER BY created_at DESC,id LIMIT 1",
    [policy.organization_id, policy.repository_id, body.before],
  );
  await client.query(
    "INSERT INTO analysis_manifests(id,organization_id,repository_id,actor_id,manifest,hash) VALUES($1,$2,$3,$4,$5,$6)",
    [
      manifestId,
      policy.organization_id,
      policy.repository_id,
      policy.actor_id,
      created.manifest,
      created.hash,
    ],
  );
  await client.query(
    "INSERT INTO analysis_jobs(id,organization_id,repository_id,manifest_id,actor_id,ref,commit_sha) VALUES($1,$2,$3,$4,$5,$6,$7)",
    [
      jobId,
      policy.organization_id,
      policy.repository_id,
      manifestId,
      policy.actor_id,
      body.ref,
      body.after,
    ],
  );
  await client.query(
    "INSERT INTO analysis_version_snapshots(id,job_id,organization_id,repository_id,actor_id,commit_sha,installation_generation,base_snapshot_id,trigger_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      id,
      jobId,
      policy.organization_id,
      policy.repository_id,
      policy.actor_id,
      body.after,
      policy.generation,
      base.rows[0]?.id ?? null,
      trigger,
    ],
  );
  await client.query(
    "INSERT INTO audit_events(id,organization_id,actor_id,action,target_id) VALUES($1,$2,$3,'architecture.push.scheduled',$4)",
    [randomUUID(), policy.organization_id, policy.actor_id, id],
  );
  return true;
}
