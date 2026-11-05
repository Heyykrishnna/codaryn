# Quality worker

Consumes leased `analysis_quality_snapshots` requests and reads the pinned GitHub archive without installing or running repository code. Uses the shared artifact worker for bounded archive reads, access rechecks, lease expiry and atomic publication. Requires `DATABASE_URL`, `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY` through the existing root environment loader.

`pnpm --filter @codaryn/quality-worker dev` starts polling. Docker Compose's `workers` profile includes this service with a read-only filesystem, bounded temporary storage, non-root user and dropped capabilities.

Static built-in rules run without external services. Optional `SEMGREP_BINARY` and `OSV_SCANNER_BINARY` must be absolute paths to trusted administrator-installed executables named `semgrep` and `osv-scanner`. These binaries are not bundled in the default image. Extend the image with compatible pinned binaries when enabling them. The worker uses bundled local Semgrep rules and a curated temporary source directory; repository scanner configuration and ignore files are not loaded. Child processes receive a minimal environment, no backend secrets, bounded output and a 45-second timeout. stderr is discarded.

OSV additionally requires `ALLOW_OSV_NETWORK=true` in both API and worker and an explicit administrator-authorized request. The fallback OSV API queries at most 100 unique resolved npm package versions. Declared ranges are not queried. OSV CLI scans at most 20 lockfiles without dependency resolution or Go call analysis. No repository build is run. Results distinguish disabled, unavailable, failed, partial and completed scans; unavailable tools never imply a clean repository.

Run unit tests with `pnpm --filter @codaryn/quality-worker test`. Integration tests require a disposable migrated PostgreSQL database and explicit `DATABASE_URL` and `DIRECT_DATABASE_URL`; use `pnpm --filter @codaryn/quality-worker test:integration`.
