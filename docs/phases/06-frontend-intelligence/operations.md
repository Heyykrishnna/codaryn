# Phase 6: Frontend architecture intelligence operations

## Database migrations

Migration `0008_frontend_intelligence.sql` adds the `frontend` stage check constraints to `analysis_jobs` and `analysis_stages`, and creates 7 normalized relational tables.

To run migrations:
```bash
pnpm db:migrate
```

To verify migration status:
```bash
pnpm db:status
```

## Performance & memory management

1. **AST reuse:** `AnalysisProcessor` compiles the TypeScript AST program once per job, reusing the parsed `ts.SourceFile` objects across the `parsing`, `graph`, and `frontend` stages.
2. **Batch database writes:** Extracted component, JSX, hook, context, route, state, and API client records are written using parameterized SQL with `ON CONFLICT DO NOTHING`.
3. **Database indexing:** B-tree indexes are established on `(job_id, name)`, `(job_id, path)`, `(job_id, source_component_id)`, `(job_id, component_id)`, and `(job_id, route_path)` to ensure constant-time filtering for UI dashboard queries.

## Worker error resilience

If an error occurs while parsing a malformed JSX or TypeScript file, the frontend extractor logs a diagnostic and safely skips the file, allowing the analysis job to continue processing remaining valid files.
