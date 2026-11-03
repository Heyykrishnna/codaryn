CREATE TABLE analysis_profiles (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
 revision integer NOT NULL CHECK (revision > 0),
 configuration jsonb NOT NULL,
 created_by text NOT NULL REFERENCES app_users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analysis_profiles_workspace_idx ON analysis_profiles(organization_id, updated_at DESC);
CREATE TABLE analysis_profile_versions (
 id uuid PRIMARY KEY,
 profile_id uuid NOT NULL REFERENCES analysis_profiles(id) ON DELETE CASCADE,
 revision integer NOT NULL CHECK (revision > 0),
 configuration jsonb NOT NULL,
 created_by text NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(profile_id, revision)
);
CREATE TABLE analysis_manifests (
 id uuid PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES organizations(id),
 repository_id uuid NOT NULL REFERENCES connected_repositories(id),
 actor_id text NOT NULL REFERENCES app_users(id),
 manifest jsonb NOT NULL,
 hash text NOT NULL CHECK (hash ~ '^[a-f0-9]{64}$'),
 status text NOT NULL DEFAULT 'configured' CHECK (status = 'configured'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analysis_manifests_workspace_idx ON analysis_manifests(organization_id, created_at DESC);
