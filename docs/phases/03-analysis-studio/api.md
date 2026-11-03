# Studio API

All endpoints require the existing session cookie and a UUID `workspaceId`. Responses use `cache-control: no-store`. Mutation requests require the exact configured web `Origin`, `content-type: application/json` and `x-codaryn-request: workspace`. Actor identity comes exclusively from the verified session.

| Method and endpoint | Input beyond workspaceId | Result |
| --- | --- | --- |
| GET `/api/v1/studio/registry` | None | Registry version and analyzer descriptors |
| GET `/api/v1/studio/profiles` | Optional page, starting at 1 | Up to 50 profiles with current revisions and configuration |
| POST `/api/v1/studio/save` | name, configuration; id and current revision for update | Created or updated profile |
| POST `/api/v1/studio/delete` | id, revision | success |
| POST `/api/v1/studio/validate` | configuration | Canonical normalized configuration |
| POST `/api/v1/studio/start` | repositoryId, ref, configuration | 201 with id, hash, configured status and immutable manifest |
| GET `/api/v1/studio/manifests` | Optional page | Up to 50 persisted manifests |

For GET, inputs are query parameters. For POST they are JSON properties. Duplicate a profile by sending its configuration and a new name to save without an id. Preset reads are workspace-scoped; profile IDs alone never grant access.

Configuration example:

```json
{
  "version": 1,
  "depth": "standard",
  "analyzers": ["react", "api"],
  "includeTests": false,
  "excludeGenerated": true,
  "exclusions": ["vendor/**"],
  "diagrams": ["architecture"],
  "documents": ["overview"]
}
```

Expected failures: 400 for invalid configuration/IDs/combinations, 401 for missing session, 403 for origin/header rejection, 404 for inaccessible workspace or repository, 409 for stale/unavailable profile or workspace profile limit, 413 for oversized bodies, 429 for manifest/upstream rate limits, 503 when GitHub is not configured, and safe 502 errors for upstream GitHub access failures. Unknown dispatch actions return 404. Unexpected errors do not expose SQL, stack traces or credentials.

A failed GitHub resolution or installation-generation check does not persist a manifest. Retrying a successful start request creates a separate request record with the same hash. Clients should display the returned status and hash rather than infer execution progress.
