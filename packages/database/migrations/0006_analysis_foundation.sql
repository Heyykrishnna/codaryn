CREATE TABLE analysis_jobs (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  repository_id uuid NOT NULL REFERENCES connected_repositories(id),
  manifest_id uuid NOT NULL REFERENCES analysis_manifests(id),
  actor_id text NOT NULL REFERENCES app_users(id),
  ref text NOT NULL,
  commit_sha text NOT NULL CHECK (commit_sha ~ '^[a-f0-9]{40}$'),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed','cancelled')),
  current_stage text NOT NULL DEFAULT 'inventory' CHECK (current_stage IN ('inventory','configuration','parsing','symbols','diagnostics','completed')),
  retries integer NOT NULL DEFAULT 0 CHECK (retries >= 0),
  max_retries integer NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
  failure_reason text,
  file_count integer NOT NULL DEFAULT 0 CHECK (file_count >= 0),
  symbol_count integer NOT NULL DEFAULT 0 CHECK (symbol_count >= 0),
  diagnostic_count integer NOT NULL DEFAULT 0 CHECK (diagnostic_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX analysis_jobs_workspace_idx ON analysis_jobs(organization_id, created_at DESC);
CREATE INDEX analysis_jobs_repo_idx ON analysis_jobs(repository_id, created_at DESC);
CREATE INDEX analysis_jobs_active_idx ON analysis_jobs(status) WHERE status IN ('queued', 'running');

CREATE TABLE analysis_stages (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  stage text NOT NULL CHECK (stage IN ('inventory','configuration','parsing','symbols','diagnostics','completed')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed','skipped')),
  items_total integer NOT NULL DEFAULT 0 CHECK (items_total >= 0),
  items_completed integer NOT NULL DEFAULT 0 CHECK (items_completed >= 0),
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, stage)
);

CREATE TABLE analysis_files (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  path text NOT NULL,
  extension text NOT NULL,
  language text NOT NULL,
  role text NOT NULL,
  size_bytes integer NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  lines_of_code integer NOT NULL DEFAULT 0 CHECK (lines_of_code >= 0),
  frameworks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, path)
);

CREATE INDEX analysis_files_job_path_idx ON analysis_files(job_id, path);

CREATE TABLE analysis_symbols (
  id text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  path text NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('function','method','class','interface','typeAlias','import','export')),
  data jsonb NOT NULL,
  location jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analysis_symbols_job_kind_idx ON analysis_symbols(job_id, kind);
CREATE INDEX analysis_symbols_job_path_idx ON analysis_symbols(job_id, path);

CREATE TABLE analysis_diagnostics (
  id text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  path text NOT NULL,
  code text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('error','warning','info')),
  message text NOT NULL,
  location jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analysis_diagnostics_job_severity_idx ON analysis_diagnostics(job_id, severity);

CREATE TABLE analysis_logs (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  stage text NOT NULL,
  level text NOT NULL CHECK (level IN ('info','warn','error')),
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analysis_logs_job_time_idx ON analysis_logs(job_id, created_at);
