import { useDeferredValue, useState } from "react";
import { control } from "@/src/features/repositories/api";
import {
  useArtifactResource,
  qualityUrl,
  inventorySchema,
  resourceSchema,
  testSchema,
} from "./api";
const views = [
  "resources",
  "tests",
  "coverage",
  "dependencies",
  "environment",
] as const;
export function QualityInventory({
  workspaceId,
  snapshotId,
}: Readonly<{ workspaceId: string; snapshotId: string }>) {
  const [kind, setKind] = useState<(typeof views)[number]>("resources"),
    [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState("");
  const deferred = useDeferredValue(search),
    base = { snapshotId };
  const list = useArtifactResource(
    qualityUrl(kind, workspaceId, { ...base, page, search: deferred }),
    inventorySchema,
  );
  const resource = useArtifactResource(
    kind === "resources" && selected
      ? qualityUrl("resource", workspaceId, { ...base, objectId: selected })
      : null,
    resourceSchema,
  );
  const test = useArtifactResource(
    kind === "tests" && selected
      ? qualityUrl("test", workspaceId, { ...base, objectId: selected })
      : null,
    testSchema,
  );
  const error = list.error || resource.error || test.error;
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <h2 className="text-xl font-semibold">
        Infrastructure, tests and dependencies
      </h2>
      <p>
        Source evidence describes static configuration and potential test calls.
        Coverage is imported from the committed report; freshness and execution
        are not independently verified. Environment values are never displayed.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-2">
          Inventory
          <select
            className={control}
            value={kind}
            onChange={(e) => {
              const value = views.find((v) => v === e.target.value);
              if (value) {
                setKind(value);
                setPage(1);
                setSelected("");
              }
            }}
          >
            {views.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-2">
          Search evidence
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
        <button
          className={control}
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          Previous inventory
        </button>
        <span>Page {page}</span>
        <button
          className={control}
          disabled={(list.data?.total ?? 0) <= page * 50}
          onClick={() => setPage(page + 1)}
        >
          Next inventory
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      {list.loading && <output>Loading inventory…</output>}
      <ul className="grid gap-3 md:grid-cols-2">
        {list.data?.items.map((item) => (
          <li
            key={item.id}
            className="min-w-0 rounded-lg border border-zinc-300 p-4 break-words dark:border-zinc-700"
          >
            {item.view === "resource" && (
              <>
                <button
                  className={control}
                  onClick={() => setSelected(item.id)}
                >
                  {item.name} · {item.kind}
                </button>
                <ul>
                  {item.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              </>
            )}
            {item.view === "test" && (
              <>
                <button
                  className={control}
                  onClick={() => setSelected(item.id)}
                >
                  {item.name}
                </button>
                <p>
                  {item.framework} · {item.mode}
                  {item.parameterized ? " · parameterized" : ""}
                </p>
              </>
            )}
            {item.view === "coverage" ? (
              <>
                <p>{item.path}</p>
                <p>
                  {item.covered}/{item.total} {item.metric} · {item.format}
                </p>
                <p className="text-xs">
                  Report: {item.reportEvidence.path}:
                  {item.reportEvidence.startLine}
                </p>
              </>
            ) : (
              <p className="mt-2 text-xs">
                {item.evidence.path}:{item.evidence.startLine}–
                {item.evidence.endLine}
              </p>
            )}
            {item.view === "dependency" && (
              <>
                <p>
                  {item.name} · {item.version}
                </p>
                <p>
                  {item.provenance} ·{" "}
                  {item.dev ? "development" : "production or unspecified"}
                </p>
              </>
            )}
            {item.view === "environment" && (
              <p>
                {item.name} · {item.source}
              </p>
            )}
          </li>
        ))}
      </ul>
      {list.data && !list.data.items.length && (
        <p>
          No supported matching evidence on this page. See snapshot diagnostics
          for analysis boundaries.
        </p>
      )}
      {(resource.loading || test.loading) && (
        <output>Loading evidence inspector…</output>
      )}
      {resource.data && (
        <aside className="rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
          <h3 className="font-semibold">
            Resource: {resource.data.resource.name}
          </h3>
          <ul>
            {resource.data.relations.map((edge) => (
              <li key={edge.id}>
                {resource.data?.resources.find((r) => r.id === edge.sourceId)
                  ?.name ?? edge.sourceId}{" "}
                → {edge.kind} →{" "}
                {resource.data?.resources.find((r) => r.id === edge.targetId)
                  ?.name ?? edge.targetId}{" "}
                · {edge.evidence.path}:{edge.evidence.startLine}
              </li>
            ))}
          </ul>
          {!resource.data.relations.length && (
            <p>No supported resource relationships.</p>
          )}
          <p className="text-xs">
            Inspector is bounded to 500 relationships and 100 resources.
          </p>
        </aside>
      )}
      {test.data && (
        <aside className="rounded-xl border border-zinc-300 p-5 dark:border-zinc-700">
          <h3 className="font-semibold">Test: {test.data.test.name}</h3>
          <ul>
            {test.data.links.map((link) => (
              <li key={link.id}>
                {link.kind}: {link.symbolName} · {link.targetEvidence.path}:
                {link.targetEvidence.startLine} · test evidence{" "}
                {link.evidence.path}:{link.evidence.startLine}
              </li>
            ))}
          </ul>
          {!test.data.links.length && (
            <p>No supported source-symbol relationship resolved.</p>
          )}
          <p className="text-xs">
            Up to 500 potential static links; this does not establish runtime
            coverage.
          </p>
        </aside>
      )}
    </section>
  );
}
