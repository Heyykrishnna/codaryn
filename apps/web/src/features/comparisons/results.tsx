import { useDeferredValue, useState } from "react";
import { control } from "@/src/features/repositories/api";
import {
  comparisonUrl,
  useArtifactResource,
  historySchema,
  detailSchema,
} from "./api";
export function ComparisonResults({
  workspaceId,
  comparisonId,
  onSelect,
  refresh,
}: Readonly<{
  workspaceId: string;
  comparisonId: string;
  onSelect: (id: string) => void;
  refresh: number;
}>) {
  const [historyPage, setHistoryPage] = useState(1),
    [page, setPage] = useState(1),
    [view, setView] = useState("changes"),
    [kind, setKind] = useState(""),
    [search, setSearch] = useState("");
  const deferred = useDeferredValue(search),
    history = useArtifactResource(
      comparisonUrl("history", workspaceId, {
        page: historyPage,
        _retry: refresh,
      }),
      historySchema,
    ),
    detail = useArtifactResource(
      comparisonId
        ? comparisonUrl("detail", workspaceId, {
            comparisonId,
            _retry: refresh,
            page,
            view,
            kind,
            search: deferred,
          })
        : null,
      detailSchema,
    );
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">Saved comparison and impact</h2>
      <label className="flex min-w-0 flex-col gap-2">
        Comparison history
        <select
          className={control}
          value={comparisonId}
          onChange={(e) => {
            onSelect(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Select a saved comparison</option>
          {comparisonId &&
            !history.data?.items.some((item) => item.id === comparisonId) && (
              <option value={comparisonId}>Selected comparison</option>
            )}
          {history.data?.items.map((item) => (
            <option key={item.id} value={item.id}>
              {new Date(item.createdAt).toLocaleString()} ·{" "}
              {item.fromId.slice(0, 8)} → {item.toId.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-3">
        <button
          className={control}
          disabled={historyPage === 1}
          onClick={() => setHistoryPage(historyPage - 1)}
        >
          Previous comparisons
        </button>
        <button
          className={control}
          disabled={(history.data?.items.length ?? 0) < 20}
          onClick={() => setHistoryPage(historyPage + 1)}
        >
          Next comparisons
        </button>
      </div>
      {history.loading && <output>Loading comparison history…</output>}
      {history.data && !history.data.items.length && (
        <p>No comparisons on this page.</p>
      )}
      {(history.error || detail.error) && (
        <p role="alert">{history.error || detail.error}</p>
      )}
      {comparisonId && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-2">
              View
              <select
                className={control}
                value={view}
                onChange={(e) => {
                  setView(e.target.value);
                  setPage(1);
                }}
              >
                <option value="changes">Architecture diff</option>
                <option value="schema">Schema diff</option>
                <option value="impact">Potential change impact</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              Change kind
              <select
                className={control}
                value={kind}
                disabled={view === "impact"}
                onChange={(e) => {
                  setKind(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {["added", "removed", "changed"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              Search changes or impacted modules
              <input
                className={control}
                value={search}
                maxLength={100}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          {detail.loading && <output>Loading comparison evidence…</output>}
          {detail.data && (
            <>
              <p>
                {detail.data.total} matching results · potential static
                semantics
                {detail.data.truncated ? " · traversal bounds reached" : ""}
              </p>
              <p>
                Drift review signals:{" "}
                {detail.data.drift.join(", ") || "none in supported rules"}.
                These signals are not proof of a breaking change.
              </p>
              <p className="text-xs break-all">
                Result SHA-256: {detail.data.hash}
              </p>
              <ul className="grid gap-3 md:grid-cols-2">
                {detail.data.items.map((item) => (
                  <li
                    key={"id" in item ? item.id : item.path}
                    className="min-w-0 rounded-lg border border-zinc-300 p-4 break-words dark:border-zinc-700"
                  >
                    {"object" in item ? (
                      <>
                        <h3 className="font-semibold">
                          {item.kind} · {item.object} · {item.name}
                        </h3>
                        <p>Before: {item.beforeSummary ?? "Absent"}</p>
                        <p>After: {item.afterSummary ?? "Absent"}</p>
                        <p className="text-xs">
                          Evidence: {item.evidence.path}:
                          {item.evidence.startLine}–{item.evidence.endLine}
                        </p>
                        <details>
                          <summary className="cursor-pointer">
                            Structural fingerprints
                          </summary>
                          <p className="text-xs break-all">
                            {item.before ?? "Absent"} → {item.after ?? "Absent"}
                          </p>
                        </details>
                      </>
                    ) : (
                      <>
                        <h3 className="font-semibold">{item.path}</h3>
                        <p>
                          {item.reason} · depth {item.depth} · via{" "}
                          {item.via ?? "direct change"}
                        </p>
                        <p>
                          Symbols in this module may be affected; the dependency
                          graph does not establish runtime execution or precise
                          symbol-level reachability.
                        </p>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              {!detail.data.items.length && (
                <p>
                  No matching supported changes. Unchanged fingerprints do not
                  establish runtime equivalence.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  className={control}
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous results
                </button>
                <span>Page {page}</span>
                <button
                  className={control}
                  disabled={detail.data.total <= page * 50}
                  onClick={() => setPage(page + 1)}
                >
                  Next results
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
