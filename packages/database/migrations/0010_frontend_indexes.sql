CREATE INDEX IF NOT EXISTS idx_analysis_frontend_contexts_job ON analysis_frontend_contexts(job_id, name);
CREATE INDEX IF NOT EXISTS idx_analysis_frontend_state_comp ON analysis_frontend_state(job_id, component_id);
