# Phase 4: Operations & Runbook

## 1. Worker Topology and Execution Profile

The static analysis engine runs inside background workers (`workers/analysis`). The processor executes CPU-bound AST operations in memory without launching external processes or writing temporary files to disk.

- **Concurreny**: The worker pool processes jobs sequentially or partitioned by workspace/repository queue partitions.
- **Memory Footprint**: Memory usage is proportional to repository AST node count. Default memory allocation is 1024 MB per worker process.
- **Timeouts**: Individual stages enforce execution time limits. A default global job timeout of 300 seconds prevents runaway analysis on extremely large or cyclic repositories.
- **Cancellation**: Cooperative `AbortController` instances receive abort signals when user-requested cancellations arrive. Analysis workers check cancellation status at every file boundary.

## 2. Retry and Backoff Policy

- **Maximum Retries**: Bounded to 3 attempts (`maxRetries = 3`).
- **Trigger Conditions**: Worker process crashes, database connection interruptions, or unhandled exceptions qualify for retry.
- **Non-Retryable Failures**: Validation errors (such as missing repository manifests or unauthorized workspace access) fail immediately without consuming retry attempts.
- **Backoff Interval**: Bounded exponential backoff ($2^{\text{attempt}} \times 5$ seconds) between automated retries.

## 3. Failure Modes and Recovery

| Failure Scenario | Root Cause | System Response | Operator Action |
|---|---|---|---|
| **Syntax Error in File** | Invalid TypeScript / TSX code | Captured in `analysis_diagnostics`; other files continue parsing. | No operator intervention required. Inspect diagnostics via API/UI. |
| **Missing `tsconfig.json`** | Repository lacks root TypeScript config | Fallback to default virtual compiler options (`target: ES2022, moduleResolution: bundler`). | Advise user to add explicit tsconfig if module resolution fails. |
| **Job Timeout Exceeded** | Repository exceeds 300s analysis window | Job transitions to `failed` with `failureReason: "Analysis exceeded maximum duration of 300s"`. | Check repository size; consider excluding large generated directories (`dist`, `build`). |
| **Worker SIGTERM / Termination** | Host node restart or scale-down | Unfinished job remains in `running` state until heartbeat expiry, then is rescheduled up to `maxRetries`. | Verify worker health and Redis/PostgreSQL queue availability. |

## 4. Operational Monitoring & Metrics

The system tracks metrics through the database and structured logs (`analysis_job_logs`):
- `files_analyzed_total`: Total count of source files parsed.
- `symbols_extracted_total`: Total count of functions, classes, interfaces, and types discovered.
- `diagnostics_total`: Count of compiler errors and warnings grouped by diagnostic code.
- `stage_duration_ms`: Execution time per analysis stage.
- `job_completion_rate`: Percentage of jobs reaching terminal `completed` state without fatal failure.

## 5. Security & Isolation Safeguards

- **No Code Execution**: Under no circumstance are repository scripts, `npm install`, `build`, or `eval` invoked. Analysis is 100% static AST inspection.
- **In-Memory Host**: File reading occurs exclusively through the virtual compiler host from the ingested archive. The worker process cannot read arbitrary host filesystem paths.
- **Data Retention & Privacy**: Extracted symbols contain only structural declaration signatures, parameter types, and location ranges. Raw source code bodies are not stored in the database.
