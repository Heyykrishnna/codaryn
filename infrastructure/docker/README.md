# Runtime images

Build from the repository root using `docker build -f infrastructure/docker/<name>.Dockerfile .`. API, web and analysis images are qualified in Phase 14; schema, execution, quality, comparison, export and ingestion retain their stage-specific runtimes. All runtime stages use the nonroot node user.

`production.compose.yml` is an operator-reviewed API/web template requiring secret-managed environment values and pinned image references. It does not start workers or provide TLS ingress/backup scheduling. Worker services remain opt-in under the root Compose workers profile. See the [Phase 14 runbook](../../docs/phases/14-production-launch/operations.md) before deployment.
