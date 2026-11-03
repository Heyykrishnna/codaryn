CREATE TABLE IF NOT EXISTS identity_audit_events (
 id uuid PRIMARY KEY,
 user_id text NOT NULL REFERENCES app_users(id),
 action text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_audit_user_idx ON identity_audit_events(user_id, created_at DESC);
