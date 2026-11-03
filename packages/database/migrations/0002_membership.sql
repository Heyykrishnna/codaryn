CREATE TABLE IF NOT EXISTS workspace_invitations (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
 recipient_id text NOT NULL REFERENCES app_users(id),
 role text NOT NULL CHECK (role IN ('admin','member')),
 expires_at timestamptz NOT NULL,
 accepted_at timestamptz
);
CREATE INDEX IF NOT EXISTS workspace_invitations_recipient_idx ON workspace_invitations(recipient_id);
CREATE TABLE IF NOT EXISTS workspace_preferences (
 user_id text PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
 organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL
);

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
