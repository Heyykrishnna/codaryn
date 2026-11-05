# Architecture comparison

The `/comparisons` workspace explorer requests immutable versions, selects a compatible Before baseline, optionally verifies against full extraction, compares completed repository versions, and browses saved architecture/schema changes and potential module impact. Owners/admins can opt a connected repository into signed branch-push analysis using an existing Studio job's configuration template.

Requests use shared session/CSRF transport and validated contracts. Pagination, search, filters, loading/error/empty states and workspace-keyed lifecycle keep historical evidence scoped to the selected workspace. Results display source evidence and static limitations; raw source/default literals are not rendered. See [Phase 12](../../../../../docs/phases/12-incremental-comparison-impact/README.md).
