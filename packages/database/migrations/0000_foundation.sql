CREATE TABLE IF NOT EXISTS foundation_jobs (id text PRIMARY KEY, completed_at timestamptz NOT NULL DEFAULT now());
