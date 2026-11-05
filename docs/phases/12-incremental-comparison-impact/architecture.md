# Phase 12 architecture

## Modules and data flow

`packages/version-engine` provides a source-only, deterministic static version projection. `workers/comparison` reads pinned GitHub archives through the existing artifact worker and publishes leased version snapshots. `apps/api/src/comparison` authorizes history, comparison, impact and push-policy operations. `/comparisons` presents snapshot selection, reuse/full-verification status, architecture/schema diffs, potential impact and saved comparisons.

The existing signed GitHub webhook receiver schedules matching push policies in the same PostgreSQL transaction as the delivery receipt. It creates a new immutable Studio manifest for the pushed SHA using the validated template configuration and current analyzer registry, inserts an analysis job and version request, and records an audit event. Duplicate deliveries and duplicate repository/ref/SHA triggers do not create another logical job. The baseline is a completed version of the same repository and workspace whose commit matches the push's `before` SHA. Missing baselines, branch creation and incompatible configuration use a full extraction; no ancestry assumption is needed for forced pushes.

## Incremental execution

Every selected file has a SHA-256 content hash and a bounded extracted artifact with its own canonical checksum. A cache entry is reused only when path, content hash, artifact checksum and compatibility agree. Compatibility covers the engine/TypeScript version, repository configuration-file hashes, and the normalized Studio configuration, analyzer registry and declared analyzer versions. Worker-loaded baseline snapshots are additionally checked against their stored hash.

Unchanged local declaration/import artifacts are reused; changed and added files are reprocessed, and deleted files are omitted. All imports are re-resolved against the current path set and supported root tsconfig aliases, so newly added/deleted targets and configuration changes cannot preserve stale graph edges. Dependent modules do not need syntax reparsing merely because an imported module changes: this projection does not perform cross-file type checking. Schema extraction reuses its projection only when the entire compatible input set is unchanged; otherwise Phase 8 schema adapters rerun to reconcile cross-file schema relationships.

The optional full-verification mode runs an independent full extraction of the same inputs and compares semantic content hashes, excluding operational reuse counters. A mismatch publishes the full result and records `fallback-full`; a match records `matched`. Normal extraction records `not-requested`. Historical snapshots are never updated by cache reuse or comparison.

## Comparison and impact

Canonical file, declaration, module-relationship and schema-object fingerprints identify added, removed and changed objects. Schema defaults, expressions and source bodies participate in hashes without being retained as raw source in this projection. Relationship summaries show targets and resolution states. Symbol IDs use path/kind/name/occurrence, keeping same-named declarations distinct without line-number churn; renames and ambiguous reordering can still appear as additions/removals or changed occurrences.

Impact performs a bounded breadth-first traversal of reverse resolved module dependencies from changed files and changed relationship sources. It considers both old and new graphs, including deleted modules. Results preserve depth and predecessor (`via`) for each potential affected module. This identifies changed symbol fingerprints and potentially affected modules; it is not precise symbol-level reachability, runtime execution or a breaking-change proof. Drift review signals cover removed symbols/schema objects, increased unresolved imports and changed compatibility.

## Persistence and integrity

Additive migration `0015_incremental_comparison.sql` creates:

- `analysis_version_snapshots`: commit/job/workspace/repository/actor identity, installation generation, optional baseline, full-verification request, deduplicated automatic trigger, lease lifecycle, immutable JSON evidence and hashes.
- `architecture_comparisons`: immutable result/impact JSON, ordered snapshot pair, repository/workspace/actor, hash and timestamp. Each ordered pair is stored once; repeated requests return the existing authorized result.
- `repository_analysis_policies`: one current branch/template policy per repository. Only owners and administrators can enable or disable it. Policy changes and scheduled jobs are audited.

Shared archive processing checks current membership, repository/installation state, installation generation, job cancellation and workspace lifecycle before extraction and under locks before publication. Automatic requests additionally require a currently enabled matching policy and an owner/admin policy actor. A policy disabled during download blocks publication. Lease IDs fence duplicate/stale claims; publication and automatic analysis-job completion occur in one transaction.

## Security and resource bounds

Repository content is parsed as data. No source program, package script, test suite, build, installer, repository config module or GitHub Actions workflow is executed. Module resolution uses only the archive path set; it has no host filesystem fallback. Raw bodies/defaults/SQL excerpts are excluded from persisted version artifacts. Binding/computed declaration names become fixed placeholders; supported credential-token patterns in labels are redacted. Import specifiers accept a bounded safe character subset and unsupported forms are diagnostic.

Inputs are limited to 10,000 files, two MiB per file and 50 MiB total, plus existing archive limits. Each file permits at most 10,000 declarations/imports; a version permits 100,000 declarations and 30,000 imports. Root alias maps are limited to 200 keys and 20 alternatives per key. Version JSON and comparison JSON are capped at 20 MiB. Comparisons cap changes at 50,000 and impact at 10,000 modules/depth 30; truncation is explicit. HTTP mutations are bounded to eight KiB, search to 100 characters, pages to 1–1,000 and results to 50 per page.

All API reads require current workspace membership. Mutations retain the existing session, Origin and custom-header CSRF guard; unauthorized resources return 404. Policy changes require owner/admin. Workspace advisory locks serialize manual writes and rate limits: five version requests and ten new comparisons per workspace/minute. Automatic push scheduling serializes each installation/repository and rejects a queue of 100 active repository requests with HTTP 503, rolling back its receipt for later operator redelivery. SQL values are parameterized. Safe failure codes replace source/parser/upstream details in user-visible errors.
