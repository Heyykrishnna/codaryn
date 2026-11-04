ALTER TABLE analysis_jobs DROP CONSTRAINT IF EXISTS analysis_jobs_current_stage_check;
ALTER TABLE analysis_jobs ADD CONSTRAINT analysis_jobs_current_stage_check
  CHECK (current_stage IN ('inventory', 'configuration', 'parsing', 'symbols', 'graph', 'frontend', 'backend', 'diagnostics', 'completed'));

ALTER TABLE analysis_stages DROP CONSTRAINT IF EXISTS analysis_stages_stage_check;
ALTER TABLE analysis_stages ADD CONSTRAINT analysis_stages_stage_check
  CHECK (stage IN ('inventory', 'configuration', 'parsing', 'symbols', 'graph', 'frontend', 'backend', 'diagnostics', 'completed'));

CREATE TABLE analysis_backend_routes (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    framework TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    file_path TEXT NOT NULL,
    handler_name TEXT NOT NULL,
    handler_symbol_id TEXT,
    controller_name TEXT,
    middleware TEXT[] NOT NULL DEFAULT '{}',
    is_dynamic BOOLEAN NOT NULL DEFAULT false,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_backend_controllers (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    framework TEXT NOT NULL,
    routes_count INTEGER NOT NULL DEFAULT 0,
    base_path TEXT,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_backend_services (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    methods TEXT[] NOT NULL DEFAULT '{}',
    injected_dependencies TEXT[] NOT NULL DEFAULT '{}',
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_backend_repositories (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    orm_type TEXT NOT NULL,
    methods TEXT[] NOT NULL DEFAULT '{}',
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_backend_middleware (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    kind TEXT NOT NULL,
    scope TEXT NOT NULL,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_backend_request_flows (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    route_id TEXT NOT NULL REFERENCES analysis_backend_routes(id) ON DELETE CASCADE,
    route_path TEXT NOT NULL,
    http_method TEXT NOT NULL,
    controller_name TEXT,
    service_names TEXT[] NOT NULL DEFAULT '{}',
    repository_names TEXT[] NOT NULL DEFAULT '{}',
    middleware_chain TEXT[] NOT NULL DEFAULT '{}',
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_backend_routes_job_path ON analysis_backend_routes(job_id, path);
CREATE INDEX idx_analysis_backend_routes_job_method ON analysis_backend_routes(job_id, method);
CREATE INDEX idx_analysis_backend_controllers_job ON analysis_backend_controllers(job_id, name);
CREATE INDEX idx_analysis_backend_services_job ON analysis_backend_services(job_id, name);
CREATE INDEX idx_analysis_backend_repositories_job ON analysis_backend_repositories(job_id, name);
CREATE INDEX idx_analysis_backend_middleware_job ON analysis_backend_middleware(job_id, name);
CREATE INDEX idx_analysis_backend_request_flows_job ON analysis_backend_request_flows(job_id, route_id);
