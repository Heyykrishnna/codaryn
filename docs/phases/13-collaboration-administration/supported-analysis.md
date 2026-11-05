# Phase 13 supported boundaries

- Sharing supports a completed architecture version or saved diagram, addressed by one current member to another. It is not anonymous/public sharing or an external guest invitation system.
- Shared metadata includes file/table/function labels where present; selected recipients must be trusted to view these architecture identities. Source bodies/default values are excluded, but this is not a universal secret-classification system for arbitrary identifier names.
- Projections are frozen and bounded at 200 nodes/500 edges. Diagram layout positions are not currently reproduced in the shared projection; the portal provides a deterministic read-only graph and accessible node list.
- Export center exposes actual SVG, JSON, Mermaid and DBML diagram formats. Existing engine PNG/PDF requests retain their legacy SVG/printable-HTML fallback behavior; native raster/PDF encoding is not claimed. Documentation exports remain available through existing export APIs.
- Frozen export content is limited to 20 MiB. Render source graph queries are bounded. Export retries use the captured bytes; changes after scheduling require a new export.
- Workspace inventories list 50 rows per page. Usage covers up to 90 days and the collaboration counters introduced here; it is not historical billing reconstruction.
- Existing user IDs are used for invitations; no email delivery or external onboarding provider was introduced.
- Retention protects latest completed snapshots, referenced versions and active version shares/download grants as documented. It is a manual derived-data policy, not automatic source/archive deletion. Saved views alone do not pin historical snapshot rows.
- Fine-grained capabilities extend existing owner/admin/member roles. They do not add per-repository ACLs beyond current workspace and GitHub installation boundaries.
- Browser verification can establish layout and empty/error states without production analysis data; populated workflows are covered with isolated database fixtures. Load testing and broader browser/accessibility qualification remain release activities.
