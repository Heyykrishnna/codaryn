CREATE TABLE analysis_quality_snapshots (
 id uuid PRIMARY KEY,
 job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 actor_id text NOT NULL REFERENCES app_users(id),
 commit_sha text NOT NULL CHECK (commit_sha ~ '^[a-f0-9]{40}$'),
 installation_generation integer NOT NULL,
 external_scans boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
 lease_id uuid,
 lease_at timestamptz,
 snapshot jsonb,
 hash text CHECK (hash IS NULL OR hash ~ '^[a-f0-9]{64}$'),
 finding_count integer NOT NULL DEFAULT 0 CHECK (finding_count >= 0),
 failure_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CONSTRAINT analysis_quality_snapshots_completion_check CHECK (
 CASE WHEN status='completed' THEN snapshot IS NOT NULL AND hash IS NOT NULL
 ELSE snapshot IS NULL AND hash IS NULL END)
);
CREATE INDEX analysis_quality_snapshots_workspace_idx ON analysis_quality_snapshots(organization_id,created_at DESC);
CREATE INDEX analysis_quality_snapshots_job_idx ON analysis_quality_snapshots(job_id,created_at DESC);
CREATE INDEX analysis_quality_snapshots_queue_idx ON analysis_quality_snapshots(status,created_at);

CREATE TABLE quality_finding_reviews (
 snapshot_id uuid NOT NULL REFERENCES analysis_quality_snapshots(id) ON DELETE CASCADE,
 finding_id text NOT NULL,
 state text NOT NULL CHECK (state IN ('open','confirmed','false-positive','resolved')),
 severity text CHECK (severity IN ('critical','high','medium','low','info','unknown')),
 reason text NOT NULL CHECK (reason IN ('needs-review','verified','not-applicable','accepted-risk','remediated')),
 revision integer NOT NULL CHECK (revision > 0),
 actor_id text NOT NULL REFERENCES app_users(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (snapshot_id,finding_id)
);
CREATE TABLE quality_finding_events (
 id uuid PRIMARY KEY,
 snapshot_id uuid NOT NULL REFERENCES analysis_quality_snapshots(id) ON DELETE CASCADE,
 finding_id text NOT NULL,
 actor_id text NOT NULL REFERENCES app_users(id),
 before_value jsonb,
 after_value jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quality_finding_events_snapshot_idx ON quality_finding_events(snapshot_id,created_at DESC);
