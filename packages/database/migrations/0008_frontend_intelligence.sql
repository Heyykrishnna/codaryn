ALTER TABLE analysis_jobs DROP CONSTRAINT IF EXISTS analysis_jobs_current_stage_check;
ALTER TABLE analysis_jobs ADD CONSTRAINT analysis_jobs_current_stage_check
  CHECK (current_stage IN ('inventory', 'configuration', 'parsing', 'symbols', 'graph', 'frontend', 'diagnostics', 'completed'));

ALTER TABLE analysis_stages DROP CONSTRAINT IF EXISTS analysis_stages_stage_check;
ALTER TABLE analysis_stages ADD CONSTRAINT analysis_stages_stage_check
  CHECK (stage IN ('inventory', 'configuration', 'parsing', 'symbols', 'graph', 'frontend', 'diagnostics', 'completed'));

CREATE TABLE analysis_frontend_components (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    kind TEXT NOT NULL,
    export_type TEXT NOT NULL,
    props JSONB NOT NULL DEFAULT '[]'::jsonb,
    hooks_count INTEGER NOT NULL DEFAULT 0,
    rendered_components_count INTEGER NOT NULL DEFAULT 0,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_frontend_jsx_elements (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    source_component_id TEXT NOT NULL REFERENCES analysis_frontend_components(id) ON DELETE CASCADE,
    target_component_name TEXT NOT NULL,
    target_component_id TEXT REFERENCES analysis_frontend_components(id) ON DELETE SET NULL,
    props TEXT[] NOT NULL DEFAULT '{}',
    is_conditional BOOLEAN NOT NULL DEFAULT false,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_frontend_hooks (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL REFERENCES analysis_frontend_components(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    dependencies TEXT[],
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_frontend_contexts (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    default_value TEXT,
    provider_component_ids TEXT[] NOT NULL DEFAULT '{}',
    consumer_component_ids TEXT[] NOT NULL DEFAULT '{}',
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_frontend_routes (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    framework TEXT NOT NULL,
    route_path TEXT NOT NULL,
    path TEXT NOT NULL,
    component_name TEXT,
    component_id TEXT REFERENCES analysis_frontend_components(id) ON DELETE SET NULL,
    dynamic_params TEXT[] NOT NULL DEFAULT '{}',
    is_layout BOOLEAN NOT NULL DEFAULT false,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_frontend_state (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    identifier TEXT NOT NULL,
    initial_value TEXT,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_frontend_api_clients (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    component_id TEXT NOT NULL,
    path TEXT NOT NULL,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    is_dynamic BOOLEAN NOT NULL DEFAULT false,
    client_type TEXT NOT NULL,
    source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analysis_frontend_components_job ON analysis_frontend_components(job_id, name);
CREATE INDEX idx_analysis_frontend_components_path ON analysis_frontend_components(job_id, path);
CREATE INDEX idx_analysis_frontend_jsx_source ON analysis_frontend_jsx_elements(job_id, source_component_id);
CREATE INDEX idx_analysis_frontend_hooks_comp ON analysis_frontend_hooks(job_id, component_id);
CREATE INDEX idx_analysis_frontend_routes_path ON analysis_frontend_routes(job_id, route_path);
CREATE INDEX idx_analysis_frontend_api_comp ON analysis_frontend_api_clients(job_id, component_id);

