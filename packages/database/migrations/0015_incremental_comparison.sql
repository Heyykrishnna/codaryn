CREATE TABLE analysis_version_snapshots (
 id uuid PRIMARY KEY,
 job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 actor_id text NOT NULL REFERENCES app_users(id),
 commit_sha text NOT NULL CHECK (commit_sha ~ '^[a-f0-9]{40}$'),
 installation_generation integer NOT NULL,
 verify_full boolean NOT NULL DEFAULT false,
 base_snapshot_id uuid REFERENCES analysis_version_snapshots(id),
 trigger_key text UNIQUE,
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
 lease_id uuid,
 lease_at timestamptz,
 snapshot jsonb,
 hash text CHECK (hash IS NULL OR hash ~ '^[a-f0-9]{64}$'),
 file_count integer NOT NULL DEFAULT 0 CHECK (file_count >= 0),
 failure_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CONSTRAINT analysis_version_snapshots_completion_check CHECK (
 CASE WHEN status='completed' THEN snapshot IS NOT NULL AND hash IS NOT NULL
 ELSE snapshot IS NULL AND hash IS NULL END)
);
CREATE INDEX analysis_version_snapshots_workspace_idx ON analysis_version_snapshots(organization_id,created_at DESC);
CREATE INDEX analysis_version_snapshots_job_idx ON analysis_version_snapshots(job_id,created_at DESC);
CREATE INDEX analysis_version_snapshots_queue_idx ON analysis_version_snapshots(status,created_at);

CREATE TABLE repository_analysis_policies (
 repository_id uuid PRIMARY KEY REFERENCES connected_repositories(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 manifest_id uuid NOT NULL REFERENCES analysis_manifests(id),
 actor_id text NOT NULL REFERENCES app_users(id),
 ref text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE architecture_comparisons (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 actor_id text NOT NULL REFERENCES app_users(id),
 from_id uuid NOT NULL REFERENCES analysis_version_snapshots(id),
 to_id uuid NOT NULL REFERENCES analysis_version_snapshots(id),
 result jsonb NOT NULL,
 hash text NOT NULL CHECK(hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(from_id,to_id)
);
CREATE INDEX architecture_comparisons_workspace_idx ON architecture_comparisons(organization_id,created_at DESC);
