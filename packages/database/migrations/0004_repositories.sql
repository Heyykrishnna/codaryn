CREATE TABLE IF NOT EXISTS github_installations (
 id bigint PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 connected boolean NOT NULL DEFAULT true,
 generation integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS connected_repositories (
 id uuid PRIMARY KEY,
 installation_id bigint NOT NULL REFERENCES github_installations(id),
 github_id bigint NOT NULL,
 full_name text NOT NULL,
 private boolean NOT NULL,
 default_branch text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 UNIQUE (installation_id, github_id)
);
CREATE TABLE IF NOT EXISTS ingestion_runs (
 id uuid PRIMARY KEY,
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 actor_id text NOT NULL REFERENCES app_users(id),
 commit_sha text NOT NULL CHECK (commit_sha ~ '^[a-f0-9]{40}$'),
 installation_generation integer NOT NULL,
 status text NOT NULL CHECK (status IN ('queued','running','completed','failed')),
 inventory jsonb,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS ingestion_runs_repo_idx ON ingestion_runs(repository_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ingestion_runs_queued_idx ON ingestion_runs(status) WHERE status='queued';
CREATE TABLE IF NOT EXISTS github_webhook_events (
 delivery_id uuid PRIMARY KEY,
 event text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now()
);
