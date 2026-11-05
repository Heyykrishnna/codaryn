CREATE TABLE api_request_budgets (
 key text NOT NULL CHECK(key ~ '^[a-f0-9]{64}$'),
 window_id bigint NOT NULL,
 count integer NOT NULL DEFAULT 1 CHECK(count>0),
 PRIMARY KEY(key,window_id)
);
CREATE INDEX api_request_budgets_window_idx ON api_request_budgets(window_id);
CREATE INDEX graph_nodes_page_idx ON analysis_graph_nodes(job_id,path,id);

ALTER TABLE analysis_jobs ADD COLUMN lease_id uuid;
ALTER TABLE analysis_jobs ADD COLUMN lease_at timestamptz;
