CREATE TABLE analysis_graph_nodes (
  id text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('file', 'symbol', 'module', 'external')),
  path text NOT NULL,
  name text NOT NULL,
  language text,
  lines_of_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analysis_graph_nodes_job_kind_idx ON analysis_graph_nodes (job_id, kind);
CREATE INDEX analysis_graph_nodes_job_path_idx ON analysis_graph_nodes (job_id, path);

CREATE TABLE analysis_graph_edges (
  id text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  source_id text NOT NULL REFERENCES analysis_graph_nodes(id) ON DELETE CASCADE,
  target_id text NOT NULL REFERENCES analysis_graph_nodes(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('imports', 'exports', 're_exports', 'calls', 'instantiates', 'extends', 'implements', 'references')),
  resolution text NOT NULL CHECK (resolution IN ('DIRECT', 'RESOLVED', 'INFERRED', 'PARTIAL', 'UNRESOLVED')),
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  weight integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analysis_graph_edges_job_source_idx ON analysis_graph_edges (job_id, source_id);
CREATE INDEX analysis_graph_edges_job_target_idx ON analysis_graph_edges (job_id, target_id);
CREATE INDEX analysis_graph_edges_job_resolution_idx ON analysis_graph_edges (job_id, resolution);

CREATE TABLE analysis_graph_cycles (
  id text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  length integer NOT NULL,
  node_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  path jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analysis_graph_cycles_job_idx ON analysis_graph_cycles (job_id);

CREATE TABLE analysis_graph_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  path text NOT NULL,
  afferent_coupling integer NOT NULL DEFAULT 0,
  efferent_coupling integer NOT NULL DEFAULT 0,
  instability numeric(5, 4) NOT NULL DEFAULT 0,
  depth integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT analysis_graph_metrics_job_path_key UNIQUE (job_id, path)
);

CREATE INDEX analysis_graph_metrics_job_idx ON analysis_graph_metrics (job_id);

CREATE TABLE analysis_unresolved_references (
  id text PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
  source_file text NOT NULL,
  source_symbol_name text NOT NULL,
  local_alias text,
  module_specifier text NOT NULL,
  status text NOT NULL CHECK (status IN ('resolved', 'unresolved', 'ambiguous', 'external')),
  evidence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analysis_unresolved_refs_job_status_idx ON analysis_unresolved_references (job_id, status);
