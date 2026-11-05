# Version engine

Pure static version extraction, compatible per-file reuse, full-equivalence verification, graph/schema fingerprint comparison and bounded reverse dependency impact. Inputs are bounded archive-relative source strings; the engine performs no filesystem resolution, repository execution, dependency installation or network requests.

`extractVersion(files, previous?, verifyFull?)` returns immutable validated evidence and its hash. `compareVersions(before, after)` returns added/removed/changed evidence, drift signals and potential impacted modules. Reuse counters are operational metadata; `contentHash` identifies the supported semantic projection. Runtime behavior is not inferred from equality.

Run `pnpm --filter @codaryn/version-engine test`. See [supported analysis](../../docs/phases/12-incremental-comparison-impact/supported-analysis.md) and [architecture](../../docs/phases/12-incremental-comparison-impact/architecture.md). Bump the engine version whenever extraction semantics change after release.
