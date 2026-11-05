CREATE TABLE workspace_controls (
 organization_id uuid PRIMARY KEY REFERENCES organizations(id),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 retention_days integer NOT NULL DEFAULT 90 CHECK(retention_days BETWEEN 7 AND 3650),
 retention_enabled boolean NOT NULL DEFAULT false,
 allow_member_sharing boolean NOT NULL DEFAULT false,
 allow_member_exports boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE resource_shares (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 job_id uuid NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES app_users(id),
 recipient_id text NOT NULL REFERENCES app_users(id),
 resource_kind text NOT NULL CHECK(resource_kind IN ('version','diagram')),
 resource_id uuid NOT NULL,
 installation_generation integer NOT NULL,
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 projection jsonb NOT NULL,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX resource_shares_workspace_idx ON resource_shares(organization_id,created_at DESC);
CREATE TABLE export_download_grants (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 export_id uuid NOT NULL REFERENCES export_jobs(id) ON DELETE CASCADE,
 actor_id text NOT NULL REFERENCES app_users(id),
 artifact_hash text NOT NULL CHECK(artifact_hash ~ '^[a-f0-9]{64}$'),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 used_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX export_download_grants_workspace_idx ON export_download_grants(organization_id,created_at DESC);
CREATE TABLE workspace_usage_daily (
 organization_id uuid NOT NULL REFERENCES organizations(id),
 day date NOT NULL DEFAULT CURRENT_DATE,
 metric text NOT NULL CHECK(metric IN ('share-created','share-opened','download-issued','download-used','retention-deleted')),
 count integer NOT NULL DEFAULT 0 CHECK(count>=0),
 PRIMARY KEY(organization_id,day,metric)
);
ALTER TABLE export_jobs ADD COLUMN artifact_binding jsonb;
