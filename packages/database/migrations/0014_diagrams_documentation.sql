CREATE TABLE saved_diagram_layouts (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
 diagram_type text NOT NULL CHECK (diagram_type IN ('system','frontend','backend','api','erd','dependencies','execution','infrastructure')),
 name text NOT NULL,
 layout_config jsonb NOT NULL,
 actor_id text NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX saved_diagram_layouts_workspace_idx ON saved_diagram_layouts(organization_id,created_at DESC);
CREATE INDEX saved_diagram_layouts_job_idx ON saved_diagram_layouts(job_id,diagram_type);

CREATE TABLE analysis_generated_documents (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
 template_id text NOT NULL CHECK (template_id IN ('overview','architecture','frontend','backend','api','schema','dependencies','execution','infrastructure','security')),
 title text NOT NULL,
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 content_markdown text NOT NULL,
 metadata jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analysis_generated_docs_workspace_idx ON analysis_generated_documents(organization_id,created_at DESC);
CREATE INDEX analysis_generated_docs_job_idx ON analysis_generated_documents(job_id,template_id);

CREATE TABLE export_jobs (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES app_users(id),
 export_type text NOT NULL CHECK (export_type IN ('diagram','document','bundle')),
 format text NOT NULL CHECK (format IN ('svg','png','pdf','markdown','mermaid','dbml','json')),
 target_id text NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
 lease_id uuid,
 lease_at timestamptz,
 artifact_size integer CHECK (artifact_size IS NULL OR artifact_size >= 0),
 artifact_hash text CHECK (artifact_hash IS NULL OR artifact_hash ~ '^[a-f0-9]{64}$'),
 error_message text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CONSTRAINT export_jobs_completion_check CHECK (
 CASE WHEN status='completed' THEN artifact_size IS NOT NULL AND artifact_hash IS NOT NULL
 ELSE true END)
);
CREATE INDEX export_jobs_workspace_idx ON export_jobs(organization_id,created_at DESC);
CREATE INDEX export_jobs_queue_idx ON export_jobs(status,created_at);
CREATE INDEX export_jobs_job_idx ON export_jobs(job_id,created_at DESC);

CREATE TABLE export_artifacts (
 id uuid PRIMARY KEY,
 export_job_id uuid NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 content_type text NOT NULL,
 filename text NOT NULL,
 payload text NOT NULL,
 size integer NOT NULL CHECK (size >= 0),
 hash text NOT NULL CHECK (hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX export_artifacts_job_idx ON export_artifacts(export_job_id);
CREATE INDEX export_artifacts_workspace_idx ON export_artifacts(organization_id,created_at DESC);
