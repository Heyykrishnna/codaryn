"use client";
import { useEffect, useState, useDeferredValue } from "react";
import { z } from "zod";
import {
  schemaComparisonSchema,
  schemaSnapshotSummarySchema,
  type SchemaComparison,
} from "@codaryn/contracts";
import {
  schemaRequest,
  snapshotsSchema,
  overviewSchema,
  diagramSchema,
  tableListSchema,
  tableDetailSchema,
  downloadSchema,
} from "./api";
import { SchemaDiagram } from "./erd";
import { SchemaInspector } from "./inspector";
import { button, control } from "@/src/features/repositories/api";
import { LoaderOrb } from "@/src/components/ui/loader-orb";
type Snapshot = z.infer<typeof schemaSnapshotSummarySchema>;
export function SchemaStudio({
  workspaceId,
}: Readonly<{ workspaceId: string }>) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [jobId, setJobId] = useState("");
  const [infer, setInfer] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [failedKey, setFailedKey] = useState("");
  const [failedDetailKey, setFailedDetailKey] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [adapter, setAdapter] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [tableId, setTableId] = useState("");
  const [layout, setLayout] = useState<"er" | "compact">("er");
  const [other, setOther] = useState("");
  const [comparison, setComparison] = useState<SchemaComparison | null>(null);
  const [result, setResult] = useState<{
    key: string;
    overview: z.infer<typeof overviewSchema>;
    diagram: z.infer<typeof diagramSchema> | null;
    tables: z.infer<typeof tableListSchema> | null;
  } | null>(null);
  const [detail, setDetail] = useState<{
    key: string;
    value: z.infer<typeof tableDetailSchema>;
  } | null>(null);
  const key = JSON.stringify([
    selected,
    deferredSearch,
    adapter,
    tablePage,
    refresh,
  ]);
  const detailKey = JSON.stringify([selected, tableId, refresh]);
  const current = result?.key === key ? result : null;
  const inspector = detail?.key === detailKey ? detail.value : null;
  useEffect(() => {
    let active = true;
    schemaRequest("snapshots", workspaceId, { page })
      .then((raw) => {
        const data = snapshotsSchema.parse(raw);
        if (active) setSnapshots(data.snapshots);
      })
      .catch(() => {
        if (active)
          setMessage(
            "Unable to load snapshots. Check workspace access and refresh.",
          );
      });
    return () => {
      active = false;
    };
  }, [workspaceId, page, refresh]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    schemaRequest("overview", workspaceId, { snapshotId: selected })
      .then(async (raw) => {
        const overview = overviewSchema.parse(raw);
        let diagram = null,
          tables = null;
        if (overview.snapshot.status === "completed") {
          const responses = await Promise.all([
            schemaRequest("diagram", workspaceId, {
              snapshotId: selected,
              search: deferredSearch,
              adapter,
            }),
            schemaRequest("tables", workspaceId, {
              snapshotId: selected,
              search: deferredSearch,
              adapter,
              page: tablePage,
            }),
          ]);
          diagram = diagramSchema.parse(responses[0]);
          tables = tableListSchema.parse(responses[1]);
        }
        if (active) setResult({ key, overview, diagram, tables });
      })
      .catch(() => {
        if (active) {
          setFailedKey(key);
          setMessage(
            "Unable to load the selected schema. Check access and refresh.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [workspaceId, selected, deferredSearch, adapter, tablePage, key]);
  useEffect(() => {
    if (!selected || !tableId) return;
    let active = true;
    schemaRequest("table", workspaceId, { snapshotId: selected, tableId })
      .then((raw) => {
        const value = tableDetailSchema.parse(raw);
        if (active) setDetail({ key: detailKey, value });
      })
      .catch(() => {
        if (active) {
          setFailedDetailKey(detailKey);
          setMessage("Table details are unavailable. Refresh and retry.");
        }
      });
    return () => {
      active = false;
    };
  }, [workspaceId, selected, tableId, detailKey]);
  const status = current?.overview.snapshot.status;
  useEffect(() => {
    if (!selected || !status || !["queued", "running"].includes(status)) return;
    const timer = setInterval(() => setRefresh((value) => value + 1), 3000);
    return () => clearInterval(timer);
  }, [selected, status]);
  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await operation();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  }
  function choose(id: string) {
    setSelected(id);
    setOther("");
    setTableId("");
    setComparison(null);
    setTablePage(1);
  }
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <p>
        Extract an immutable schema from the selected analysis job’s pinned
        commit. The schema worker must be running. No database connection to the
        analyzed project is required.
      </p>
      <output aria-live="polite" className="block text-sm">
        {busy ? "Working…" : message}
      </output>
      <form
        className="flex flex-wrap items-end gap-3"
        action={async () => {
          await run(async () => {
            const request = schemaSnapshotSummarySchema.parse(
              await schemaRequest(
                "request",
                workspaceId,
                { jobId, inferRelations: infer },
                true,
              ),
            );
            choose(request.id);
            setRefresh((value) => value + 1);
            setMessage(
              "Snapshot queued. Extraction reads static declarations only.",
            );
          });
        }}
      >
        <label className="flex flex-1 flex-col gap-2">
          <span>Analysis job UUID</span>
          <input
            className={control}
            value={jobId}
            onChange={(event) => setJobId(event.target.value)}
            required
            pattern="[a-f0-9-]{36}"
            placeholder="Paste an analysis job ID"
          />
        </label>
        <label className="flex gap-2">
          <input
            type="checkbox"
            checked={infer}
            onChange={(event) => setInfer(event.target.checked)}
          />
          <span>Infer naming-based relations</span>
        </label>
        <button type="submit" className={button} disabled={busy || !jobId}>
          Extract schema
        </button>
      </form>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-1 flex-col gap-2">
          <span>Schema snapshot</span>
          <select
            className={control}
            value={selected}
            onChange={(event) => choose(event.target.value)}
          >
            <option value="">Select a snapshot</option>
            {selected && !snapshots.some((item) => item.id === selected) && (
              <option value={selected}>{selected}</option>
            )}
            {snapshots.map((item) => (
              <option key={item.id} value={item.id}>
                {item.commitSha.slice(0, 12)} · {item.status} ·{" "}
                {item.tableCount} tables · {item.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={control}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
        <button
          type="button"
          className={control}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous snapshots
        </button>
        <button
          type="button"
          className={control}
          disabled={snapshots.length < 20}
          onClick={() => setPage(page + 1)}
        >
          Next snapshots
        </button>
      </div>
      {!snapshots.length && (
        <p>
          No snapshots on this page. Create an analysis manifest and job in
          Analysis Studio first.
        </p>
      )}
      {selected && !current && failedKey !== key && (
        <div className="py-8">
          <LoaderOrb
            label="Loading schema…"
            description="Extracting table schemas, column types, and foreign key relations"
          />
        </div>
      )}
      {current && (
        <>
          <section className="flex flex-wrap gap-5 rounded-xl border border-dotted border-zinc-800 bg-[#111216] p-5">
            <h2 className="w-full text-xl font-semibold">Schema overview</h2>
            <p>Status: {current.overview.snapshot.status}</p>
            <p>
              {current.overview.tables} tables · {current.overview.columns}{" "}
              columns · {current.overview.relations} relations
            </p>
            <p className="w-full text-xs break-all">
              Snapshot: {selected} · SHA-256:{" "}
              {current.overview.snapshot.hash ?? "Pending"}
            </p>
            {current.overview.snapshot.failureCode && (
              <p role="alert">
                Extraction failed: {current.overview.snapshot.failureCode}.
                Check the App connection and request a new snapshot.
              </p>
            )}
          </section>
          {current.overview.snapshot.status === "completed" && (
            <>
              <section className="flex flex-wrap gap-3">
                <label className="flex flex-col gap-2">
                  <span>Search tables and domains</span>
                  <input
                    className={control}
                    value={search}
                    maxLength={100}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setTablePage(1);
                    }}
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span>Schema source</span>
                  <select
                    className={control}
                    value={adapter}
                    onChange={(event) => {
                      setAdapter(event.target.value);
                      setTablePage(1);
                    }}
                  >
                    <option value="">All adapters</option>
                    <option value="sql">SQL and migrations</option>
                    <option value="prisma">Prisma</option>
                    <option value="drizzle">Drizzle</option>
                  </select>
                </label>
                <label className="flex flex-col gap-2">
                  <span>Diagram layout</span>
                  <select
                    className={control}
                    value={layout}
                    onChange={(event) =>
                      setLayout(
                        event.target.value === "compact" ? "compact" : "er",
                      )
                    }
                  >
                    <option value="er">Full ER layout</option>
                    <option value="compact">Compact groups</option>
                  </select>
                </label>
                {(["json", "svg", "markdown"] as const).map((format) => (
                  <button
                    type="button"
                    key={format}
                    className={control}
                    disabled={busy}
                    onClick={async () => {
                      await run(() =>
                        downloadSchema(workspaceId, selected, format, layout),
                      );
                    }}
                  >
                    Export {format}
                  </button>
                ))}
              </section>
              {current.diagram && (
                <>
                  <SchemaDiagram
                    tables={current.diagram.tables}
                    relations={current.diagram.relations}
                    selected={tableId}
                    onSelect={setTableId}
                    layout={layout}
                  />
                  {current.diagram.truncated && (
                    <p>
                      Diagram shows the first 100 matching tables. Narrow the
                      filters or export JSON for the complete snapshot.
                    </p>
                  )}
                </>
              )}
              <section aria-label="Table browser">
                <h2 className="text-xl font-semibold">
                  Table browser ({current.tables?.total ?? 0})
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {current.tables?.items.map((item) => (
                    <button
                      type="button"
                      className={control}
                      key={item.id}
                      onClick={() => setTableId(item.id)}
                    >
                      {item.namespace}.{item.name} · {item.columnCount} columns
                      {item.joinTable ? " · join" : ""}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className={control}
                    disabled={tablePage === 1}
                    onClick={() => setTablePage(tablePage - 1)}
                  >
                    Previous tables
                  </button>
                  <button
                    type="button"
                    className={control}
                    disabled={(current.tables?.total ?? 0) <= tablePage * 50}
                    onClick={() => setTablePage(tablePage + 1)}
                  >
                    Next tables
                  </button>
                </div>
              </section>
              {tableId && !inspector && failedDetailKey !== detailKey && (
                <output>Loading table inspector…</output>
              )}
              {inspector && (
                <SchemaInspector key={inspector.table.id} detail={inspector} />
              )}
              <section className="flex flex-col gap-3">
                <h2 className="text-xl font-semibold">Schema comparison</h2>
                <label className="flex flex-col gap-2">
                  <span>Compare current snapshot to</span>
                  <select
                    className={control}
                    value={other}
                    onChange={(event) => setOther(event.target.value)}
                  >
                    <option value="">Select another completed snapshot</option>
                    {snapshots
                      .filter(
                        (item) =>
                          item.id !== selected && item.status === "completed",
                      )
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.commitSha.slice(0, 12)} · {item.id.slice(0, 8)}
                        </option>
                      ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={button}
                  disabled={busy || !other}
                  onClick={async () => {
                    await run(async () => {
                      setComparison(
                        schemaComparisonSchema.parse(
                          await schemaRequest("compare", workspaceId, {
                            snapshotId: selected,
                            otherId: other,
                          }),
                        ),
                      );
                    });
                  }}
                >
                  Compare structures
                </button>
                {comparison && (
                  <>
                    <p>
                      {comparison.changes.length} supported structural changes.
                      Source-only formatting changes do not count.
                    </p>
                    <ul className="flex max-h-96 flex-col gap-2 overflow-auto">
                      {comparison.changes.map((item) => (
                        <li
                          key={`${item.object}:${item.kind}:${item.name}`}
                          className="rounded-lg border border-zinc-300 p-3 text-sm dark:border-zinc-700"
                        >
                          <strong>
                            {item.kind} {item.object}: {item.name}
                          </strong>
                          <p className="break-all">
                            Before: {item.before ?? "Absent"}
                          </p>
                          <p className="break-all">
                            After: {item.after ?? "Absent"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
              <details>
                <summary className="cursor-pointer font-semibold">
                  Enums and schema diagnostics (
                  {current.overview.diagnosticCount})
                </summary>
                {current.overview.enums.map((item) => (
                  <p key={item.name}>
                    {item.name}: {item.values.join(", ")}
                  </p>
                ))}
                <ul>
                  {current.overview.diagnostics.map((item) => (
                    <li
                      key={`${item.code}:${item.evidence.path}:${item.evidence.startLine}:${item.message}`}
                    >
                      {item.code}: {item.message} · {item.evidence.path}:
                      {item.evidence.startLine}
                    </li>
                  ))}
                </ul>
              </details>
            </>
          )}
        </>
      )}
    </div>
  );
}
