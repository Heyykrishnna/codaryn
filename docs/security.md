# Security and privacy

These are requirements for future implementation, not controls provided by this scaffold.

- Authorize every workspace, repository, snapshot and export on the server; test cross-tenant isolation.
- Use a least-privilege GitHub App, short-lived installation tokens, encrypted secrets and verified webhooks with replay protection.
- Treat repository content and archives as untrusted. Reject traversal and unsafe links, bound extraction size and resource use, and isolate ephemeral workers without privileged containers, host mounts or Docker socket access. Restrict outbound network access.
- Never install repository dependencies or execute repository scripts, lifecycle hooks or builds during ordinary static analysis. Do not use an LLM.
- Enforce CPU, memory and time limits, cancellation, cleanup and retention. Redact secrets from logs and diagnostics; avoid exposing private source through exports or errors.
- Scope artifacts to authorized snapshots, use short-lived signed links, audit administrative actions and test deletion and recovery.

Threat modeling, isolation enforcement and security review are required before ingesting real repositories. See the full specification for the complete control list.
