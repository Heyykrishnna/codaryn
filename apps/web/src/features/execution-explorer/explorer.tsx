"use client";
import { useEffect, useState, useDeferredValue } from "react";
import { executionSnapshotSummarySchema } from "@codaryn/contracts";
import { workspaceRequest } from "@/src/lib/workspace-request";
import { button, control } from "@/src/features/repositories/api";
import {
  executionUrl,
  useExecutionResource,
  jobsSchema,
  summariesSchema,
  overviewSchema,
  functionsSchema,
  detailSchema,
  neighborhoodSchema,
  callsSchema,
  entriesSchema,
  pathsSchema,
} from "./api";
import { ExecutionGraph } from "./graph";
import { FunctionInspector } from "./inspector";
export function ExecutionExplorer({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const [refresh, setRefresh] = useState(0),
    [page, setPage] = useState(1),
    [snapshotId, setSnapshotId] = useState(""),
    [jobId, setJobId] = useState(""),
    [functionId, setFunctionId] = useState(""),
    [search, setSearch] = useState(""),
    [functionPage, setFunctionPage] = useState(1),
    [depth, setDepth] = useState(1),
    [targetId, setTargetId] = useState(""),
    [targetSearch, setTargetSearch] = useState(""),
    [pathDepth, setPathDepth] = useState(6),
    [pathRequested, setPathRequested] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const deferred = useDeferredValue(search),
    targetDeferred = useDeferredValue(targetSearch);
  const base = { snapshotId, _retry: refresh };
  const jobs = useExecutionResource(
    executionUrl("jobs", workspaceId, { _retry: refresh }),
    jobsSchema,
  );
  const history = useExecutionResource(
    executionUrl("snapshots", workspaceId, { page, _retry: refresh }),
    summariesSchema,
  );
  const overview = useExecutionResource(
    snapshotId ? executionUrl("overview", workspaceId, base) : null,
    overviewSchema,
  );
  const ready = overview.data?.snapshot.status === "completed";
  const functions = useExecutionResource(
    ready
      ? executionUrl("functions", workspaceId, {
          ...base,
          page: functionPage,
          search: deferred,
        })
      : null,
    functionsSchema,
  );
  const targetFunctions = useExecutionResource(
    ready
      ? executionUrl("functions", workspaceId, {
          ...base,
          page: 1,
          search: targetDeferred,
        })
      : null,
    functionsSchema,
  );
  const detail = useExecutionResource(
    ready && functionId
      ? executionUrl("function", workspaceId, { ...base, functionId })
      : null,
    detailSchema,
  );
  const neighborhood = useExecutionResource(
    ready && functionId
      ? executionUrl("neighborhood", workspaceId, {
          ...base,
          functionId,
          depth,
        })
      : null,
    neighborhoodSchema,
  );
  const unresolved = useExecutionResource(
    ready
      ? executionUrl("unresolved", workspaceId, {
          ...base,
          page: functionPage,
          search: deferred,
        })
      : null,
    callsSchema,
  );
  const entries = useExecutionResource(
    ready
      ? executionUrl("entries", workspaceId, {
          ...base,
          page: functionPage,
          search: deferred,
        })
      : null,
    entriesSchema,
  );
  const paths = useExecutionResource(
    ready && functionId && targetId && pathRequested
      ? executionUrl("paths", workspaceId, {
          ...base,
          functionId,
          targetId,
          depth: pathDepth,
        })
      : null,
    pathsSchema,
  );
  const status = overview.data?.snapshot.status;
  useEffect(() => {
    if (!snapshotId || !status || !["queued", "running"].includes(status))
      return;
    const timer = setInterval(() => setRefresh((n) => n + 1), 3000);
    return () => clearInterval(timer);
  }, [snapshotId, status]);
  function chooseSnapshot(id: string) {
    setSnapshotId(id);
    setFunctionId("");
    setTargetId("");
    setPathRequested(false);
    setFunctionPage(1);
  }
  const error =
    jobs.error ||
    history.error ||
    overview.error ||
    functions.error ||
    detail.error ||
    neighborhood.error ||
    unresolved.error ||
    entries.error ||
    paths.error;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p>
        Explore potential static execution. Resolved targets identify
        declarations, not guaranteed runtime dispatch. Deferred callback
        references are distinct from invocation. Dynamic calls stay unresolved.
      </p>
      <output aria-live="polite">
        {busy ? "Queuing extraction…" : message}
      </output>
      {error && <p role="alert">{error}</p>}
      <form
        className="flex flex-wrap items-end gap-3"
        action={async () => {
          setBusy(true);
          setMessage("");
          try {
            const result = executionSnapshotSummarySchema.parse(
              await workspaceRequest(
                "execution",
                "request",
                workspaceId,
                { jobId },
                true,
              ),
            );
            chooseSnapshot(result.id);
            setRefresh((n) => n + 1);
            setMessage(
              "Execution snapshot queued for the selected immutable commit.",
            );
          } catch (error) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Extraction request failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span>Repository analysis</span>
          <select
            className={control}
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            required
          >
            <option value="">Select a recent analysis job</option>
            {jobs.data?.jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.full_name} · {job.ref} · {job.commit_sha.slice(0, 12)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={button} disabled={busy || !jobId}>
          Extract execution graph
        </button>
      </form>
      {jobs.loading && <output>Loading analysis jobs…</output>}
      {jobs.data && !jobs.data.jobs.length && (
        <p>
          No eligible jobs. Create an analysis manifest and job in Analysis
          Studio first.
        </p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          <span>Execution snapshot</span>
          <select
            className={control}
            value={snapshotId}
            onChange={(event) => chooseSnapshot(event.target.value)}
          >
            <option value="">Select a snapshot</option>
            {snapshotId &&
              !history.data?.snapshots.some((s) => s.id === snapshotId) && (
                <option value={snapshotId}>Requested snapshot</option>
              )}
            {history.data?.snapshots.map((snapshot) => (
              <option key={snapshot.id} value={snapshot.id}>
                {snapshot.commitSha.slice(0, 12)} · {snapshot.status} ·{" "}
                {snapshot.functionCount} functions · {snapshot.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <button
          className={control}
          type="button"
          onClick={() => setRefresh((n) => n + 1)}
        >
          Refresh
        </button>
        <button
          className={control}
          type="button"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous snapshots
        </button>
        <button
          className={control}
          type="button"
          disabled={(history.data?.snapshots.length ?? 0) < 20}
          onClick={() => setPage(page + 1)}
        >
          Next snapshots
        </button>
      </div>
      {history.loading && <output>Loading snapshot history…</output>}
      {history.data && !history.data.snapshots.length && (
        <p>No execution snapshots on this page.</p>
      )}
      {overview.loading && <output>Loading execution overview…</output>}
      {overview.data && (
        <section className="rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
          <h2 className="text-xl font-semibold">Execution overview</h2>
          <p>
            {overview.data.snapshot.status} · {overview.data.functions}{" "}
            functions · {overview.data.calls} call/reference sites ·{" "}
            {overview.data.unresolved} unresolved · {overview.data.entries}{" "}
            potential entry points
          </p>
          <p className="text-xs break-all">
            Commit: {overview.data.snapshot.commitSha} · SHA-256:{" "}
            {overview.data.snapshot.hash ?? "Pending"}
          </p>
          {overview.data.snapshot.failureCode && (
            <p role="alert">
              Extraction failed: {overview.data.snapshot.failureCode}. Verify
              repository access and request again.
            </p>
          )}
        </section>
      )}
      {ready && (
        <>
          <section className="flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-2">
              <span>Search functions, entries and unresolved calls</span>
              <input
                className={control}
                value={search}
                maxLength={100}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setFunctionPage(1);
                }}
              />
            </label>
            <button
              type="button"
              className={control}
              disabled={functionPage === 1}
              onClick={() => setFunctionPage(functionPage - 1)}
            >
              Previous objects
            </button>
            <span>Page {functionPage}</span>
            <button
              type="button"
              className={control}
              disabled={
                Math.max(
                  functions.data?.total ?? 0,
                  entries.data?.total ?? 0,
                  unresolved.data?.total ?? 0,
                ) <=
                functionPage * 50
              }
              onClick={() => setFunctionPage(functionPage + 1)}
            >
              Next objects
            </button>
          </section>
          {functions.loading && <output>Loading functions…</output>}
          <section>
            <h2 className="text-xl font-semibold">
              Function browser ({functions.data?.total ?? 0})
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {functions.data?.items.map((fn) => (
                <button
                  key={fn.id}
                  type="button"
                  className={control}
                  onClick={() => {
                    setFunctionId(fn.id);
                    setPathRequested(false);
                  }}
                >
                  {fn.name} · {fn.kind} · {fn.evidence.path}:
                  {fn.evidence.startLine}
                </button>
              ))}
            </div>
            {functions.data && !functions.data.items.length && (
              <p>No matching functions.</p>
            )}
          </section>
          <section>
            <h2 className="text-xl font-semibold">Potential entry points</h2>
            <ul className="flex max-h-64 flex-col gap-2 overflow-auto">
              {entries.data?.items.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={control}
                    onClick={() => setFunctionId(entry.functionId)}
                  >
                    {entry.kind}: {entry.label} · {entry.evidence.path}:
                    {entry.evidence.startLine}
                  </button>
                </li>
              ))}
            </ul>
            {entries.data && !entries.data.items.length && (
              <p>No supported entry points on this page.</p>
            )}
          </section>
          <section>
            <h2 className="text-xl font-semibold">
              Unresolved call inspector ({unresolved.data?.total ?? 0})
            </h2>
            <ul className="flex max-h-64 flex-col gap-2 overflow-auto">
              {unresolved.data?.items.map((call) => (
                <li
                  key={call.id}
                  className="rounded-lg border border-zinc-300 p-3 text-sm dark:border-zinc-700"
                >
                  <button
                    className={control}
                    type="button"
                    onClick={() => setFunctionId(call.sourceId)}
                  >
                    {call.expression}
                  </button>
                  <p>
                    {call.reason} · {call.evidence.path}:
                    {call.evidence.startLine}
                  </p>
                </li>
              ))}
            </ul>
            {unresolved.data && !unresolved.data.items.length && (
              <p>No unresolved calls on this page.</p>
            )}
          </section>
          {functionId && (
            <>
              <label className="flex flex-col gap-2">
                <span>Function neighborhood depth</span>
                <select
                  className={control}
                  value={depth}
                  onChange={(event) => setDepth(Number(event.target.value))}
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              {neighborhood.loading && (
                <output>Loading call neighborhood…</output>
              )}
              {neighborhood.data && (
                <>
                  <ExecutionGraph
                    title="Function call graph"
                    nodes={neighborhood.data.functions}
                    edges={neighborhood.data.calls
                      .filter((call) => call.targetId)
                      .map((call) => ({
                        id: call.id,
                        sourceId: call.sourceId,
                        targetId: call.targetId!,
                        label: `${call.expression}: ${call.reason}`,
                        deferred: call.kind === "callback",
                      }))}
                    onSelect={setFunctionId}
                  />
                  {neighborhood.data.truncated && (
                    <p>
                      Neighborhood is bounded to 200 functions and 500 edges.
                      Narrow the depth.
                    </p>
                  )}
                </>
              )}
              {detail.loading && <output>Loading function inspector…</output>}
              {detail.data && (
                <FunctionInspector
                  key={detail.data.function.id}
                  detail={detail.data}
                  onSelect={setFunctionId}
                />
              )}
              <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold">Potential path search</h2>
                <p>
                  Search from the inspected function. Callback references are
                  excluded because passing a function does not prove invocation.
                  Results contain at most 20 simple paths and 5,000 visited
                  states.
                </p>
                <label className="flex flex-col gap-2">
                  <span>Find a target function</span>
                  <input
                    className={control}
                    value={targetSearch}
                    maxLength={100}
                    onChange={(event) => {
                      setTargetSearch(event.target.value);
                      setPathRequested(false);
                    }}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span>Target function</span>
                  <select
                    className={control}
                    value={targetId}
                    onChange={(event) => {
                      setTargetId(event.target.value);
                      setPathRequested(false);
                    }}
                  >
                    <option value="">Select a target</option>
                    {targetFunctions.data?.items.map((fn) => (
                      <option key={fn.id} value={fn.id}>
                        {fn.name} · {fn.evidence.path}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span>Maximum call edges</span>
                  <select
                    className={control}
                    value={pathDepth}
                    onChange={(event) => {
                      setPathDepth(Number(event.target.value));
                      setPathRequested(false);
                    }}
                  >
                    {[3, 6, 9, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={button}
                  disabled={!targetId}
                  onClick={() => setPathRequested(true)}
                >
                  Find potential paths
                </button>
                {paths.loading && <output>Searching bounded paths…</output>}
                {paths.data && (
                  <>
                    <p>
                      {paths.data.paths.length} potential paths ·{" "}
                      {paths.data.visited} visited states
                      {paths.data.truncated ? " · traversal limit reached" : ""}
                    </p>
                    <ol className="flex flex-col gap-2">
                      {paths.data.paths.map((path) => (
                        <li
                          key={path.join("|")}
                          className="rounded-lg border border-zinc-300 p-3 dark:border-zinc-700"
                        >
                          {path.map((id, index) => (
                            <span key={id}>
                              {index > 0 && " → "}
                              <button
                                type="button"
                                className="text-indigo-600 underline dark:text-indigo-400"
                                onClick={() => setFunctionId(id)}
                              >
                                {paths.data?.functions.find(
                                  (fn) => fn.id === id,
                                )?.name ?? id}
                              </button>
                            </span>
                          ))}
                        </li>
                      ))}
                    </ol>
                    {!paths.data.paths.length && (
                      <p>
                        No supported path found within these bounds. This does
                        not prove runtime independence.
                      </p>
                    )}
                  </>
                )}
              </section>
            </>
          )}
          <details>
            <summary className="cursor-pointer font-semibold">
              Analysis diagnostics ({overview.data?.diagnosticCount ?? 0})
            </summary>
            <ul>
              {overview.data?.diagnostics.map((diagnostic, index) => (
                <li
                  key={`${diagnostic.code}:${diagnostic.evidence.path}:${diagnostic.evidence.startLine}:${index}`}
                >
                  {diagnostic.code}: {diagnostic.message} ·{" "}
                  {diagnostic.evidence.path}:{diagnostic.evidence.startLine}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
