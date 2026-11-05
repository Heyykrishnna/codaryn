CREATE TABLE analysis_schema_snapshots (
 id uuid PRIMARY KEY,
 job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 actor_id text NOT NULL REFERENCES app_users(id),
 commit_sha text NOT NULL CHECK (commit_sha ~ '^[a-f0-9]{40}$'),
 installation_generation integer NOT NULL,
 infer_relations boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
 lease_id uuid,
 lease_at timestamptz,
 snapshot jsonb,
 hash text CHECK (hash IS NULL OR hash ~ '^[a-f0-9]{64}$'),
 table_count integer NOT NULL DEFAULT 0 CHECK (table_count >= 0),
 failure_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CONSTRAINT analysis_schema_snapshots_completion_check CHECK ((status='completed' AND snapshot IS NOT NULL AND hash IS NOT NULL) OR (status<>'completed' AND snapshot IS NULL AND hash IS NULL))
);
CREATE INDEX analysis_schema_snapshots_workspace_idx ON analysis_schema_snapshots(organization_id,created_at DESC);
CREATE INDEX analysis_schema_snapshots_job_idx ON analysis_schema_snapshots(job_id,created_at DESC);
CREATE INDEX analysis_schema_snapshots_queue_idx ON analysis_schema_snapshots(status,created_at);
