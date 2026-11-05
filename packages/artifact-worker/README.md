# Artifact worker

Shared commit-pinned archive processing for schema and execution artifacts. The two allowed queue/count identifiers are internal constants. Extractor adapters return a snapshot, hash and object count; leases, authorization, archive cleanup and atomic publication remain centralized. Integration coverage lives in both worker packages.
