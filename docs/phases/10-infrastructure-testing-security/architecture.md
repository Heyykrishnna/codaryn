# Phase 10 architecture and security boundaries

## Data flow

The authenticated `/quality` interface requests a quality snapshot for an existing workspace analysis job. The API resolves the stored immutable commit, repository and GitHub installation generation into `analysis_quality_snapshots`. A dedicated quality worker claims a lease, checks current workspace membership and installation permissions, downloads a bounded archive, rechecks access, and extracts static evidence. It verifies the commit and current access again before atomic publication. Installation generation changes fence revoked work. Expired leases retry at most three times. Archive contents are discarded after processing.

`packages/engineering-analyzer` owns pure extraction and canonical contracts. `packages/execution-analyzer` supplies a source-only call index for potential test-to-symbol links. `packages/artifact-worker` owns shared queue processing and shutdown. `workers/quality` owns optional scanner subprocesses and their temporary files. `apps/api/src/quality` owns workspace access, pagination and review transactions. `apps/web/src/features/quality-explorer` owns presentation and loading/error states. Existing schema and execution worker regression tests cover the shared processing changes.

## Persistence and review

Migration `0013_engineering_quality.sql` adds three tables without modifying previous migrations or dropping data:

- `analysis_quality_snapshots`: immutable commit, actor, workspace, repository, generation, external-lookup authorization, lease state, canonical snapshot/hash, count and safe failure code.
- `quality_finding_reviews`: current state, optional severity override, enumerated reason and optimistic revision, scoped by snapshot and finding.
- `quality_finding_events`: append-only application review history with before/after values, actor and time. Application code exposes no edit/delete endpoint.

Reviews do not mutate the underlying snapshot or its hash. Only owners and administrators can review findings. Membership is read on every request; workspace deletion and membership removal deny access. Writes hold a workspace advisory lock and row locks, check the expected revision, and write both review history and workspace audit records in one transaction. Strict schemas reject arbitrary notes. Requests are limited to five snapshots and 60 reviews per workspace per minute. Cross-workspace resources return 404; unauthenticated requests return 401. Mutations require the existing origin and custom-header CSRF guard.

## Scanner isolation

Repository programs, test suites, Docker builds, Actions workflows, package scripts and dependency installers are never run. YAML is parsed as data with alias bounds. Semgrep receives only curated JavaScript/TypeScript files and a bundled local rules file, with repository ignore/config files excluded. Metrics and version checking are disabled. OSV CLI receives only supported lockfiles plus a trusted empty configuration, with dependency resolution and Go call analysis disabled. Neither adapter invokes fix mode or remote rule registries.

Executables are administrator-configured absolute paths with expected basenames. Processes run without a shell or inherited backend secrets, with a private temporary HOME, 45-second timeout, five-MiB combined output limit and process-group cleanup. Raw stderr, scanner messages, source excerpts and parser errors are not published. Importers accept known rules, bounded report shapes and source locations from the analyzed archive only. Malformed or missing tools produce explicit failed/unavailable/partial statuses.

External OSV requests require both deployment policy (`ALLOW_OSV_NETWORK=true` in API and worker) and an explicit owner/admin request. The worker checks the role again before extraction and publication. The API fallback uses a fixed HTTPS endpoint, rejects redirects and bounds response size/time. Only supported resolved npm names/versions are queried; declared ranges are not installed-version evidence. Outbound dependency queries disclose those names/versions to OSV, so the UI makes consent explicit. Operators should restrict egress to required GitHub and OSV services and install trusted pinned scanner binaries in an extended worker image. The default image contains no Semgrep/OSV executable.

## Privacy and limits

Environment views store names and source locations, never values. Credential findings contain rule metadata and line evidence without matched text. Detected literal credentials are removed from labels elsewhere before a snapshot is published. Ambiguous credential encodings fail closed. This is a supported-pattern detector, not a guarantee that every secret in an arbitrary repository is recognized.

Input limits are 10,000 files, two MiB per file and 50 MiB total, plus archive limits inherited from ingestion. Snapshot arrays have contract bounds and serialized storage is capped at 20 MiB. Inspectors return at most 500 relationships/links and 100 neighboring resources; diagnostics show the first 30. Repository parser configuration, module evaluation and host filesystem fallbacks are not used.

When supported credential signals occur anywhere in the snapshot, external vulnerability lookup uses the sanitized metadata-only OSV API path, even when an OSV CLI is configured. Raw lockfiles from those snapshots are not passed to external scanner commands; redacted identifiers are omitted and scanner status/messages disclose packages that were not queried.
