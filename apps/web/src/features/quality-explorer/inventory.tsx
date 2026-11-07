"use client";

import { useDeferredValue, useState } from "react";
import {
  useArtifactResource,
  qualityUrl,
  inventorySchema,
  resourceSchema,
  testSchema,
} from "./api";
import { CandyButton } from "@/src/components/ui/candy-button";
import { LoadingIndicator } from "@/src/components/ui/loading-indicator";
import { cn } from "@/lib/utils";

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
  const [kind, setKind] = useState<(typeof views)[number]>("resources");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState("");

  const deferred = useDeferredValue(search);
  const base = { snapshotId };

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
    <section className="flex min-w-0 flex-col gap-6 rounded-2xl border border-dotted border-neutral-300 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-1 border-b border-dotted border-neutral-300 pb-4">
        <h2 className="text-lg font-bold text-neutral-950">
          Infrastructure, tests and dependencies
        </h2>
        <p className="text-xs text-neutral-600">
          Source evidence describes static configuration and potential test
          calls. Coverage is imported from committed reports; freshness and
          execution are bounded.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 rounded-xl border border-dotted border-neutral-300 bg-white p-1">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              className={cn(
                "cursor-pointer rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all select-none",
                kind === v
                  ? "bg-white font-semibold text-neutral-950 shadow-[0_2px_0_0_#d4d4d8]"
                  : "text-neutral-600 hover:bg-white hover:text-neutral-950",
              )}
              onClick={() => {
                setKind(v);
                setPage(1);
                setSelected("");
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex max-w-md min-w-[16rem] flex-1 items-center rounded-lg border border-dotted border-neutral-300 bg-white px-3 py-1.5 text-xs">
          <svg
            className="mr-2 h-4 w-4 shrink-0 text-neutral-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            className="w-full bg-transparent text-neutral-950 placeholder-neutral-600 outline-none"
            placeholder={`Filter ${kind}…`}
            value={search}
            maxLength={100}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-neutral-500/20 bg-neutral-100/10 p-3 text-xs text-neutral-800"
        >
          {error}
        </div>
      )}

      {list.loading && (
        <div className="py-4">
          <LoadingIndicator
            variant="inline"
            label={`Loading ${kind} evidence…`}
          />
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {list.data?.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "motion-safe:ease-control flex flex-col justify-between gap-3 rounded-xl border p-4 motion-safe:transition-[background-color,border-color,color,translate,scale,box-shadow] motion-safe:duration-150",
              selected === item.id
                ? "border-dotted border-neutral-400 bg-neutral-100"
                : "border-dotted border-neutral-300 bg-white hover:border-neutral-400",
            )}
          >
            {item.view === "resource" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold text-neutral-950">
                    {item.name}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-900">
                    {item.kind}
                  </span>
                </div>
                {item.details.length > 0 && (
                  <ul className="flex flex-col gap-0.5 text-xs text-neutral-600">
                    {item.details.map((detail) => (
                      <li key={detail} className="truncate">
                        • {detail}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="pt-2">
                  <CandyButton
                    type="button"
                    variant={selected === item.id ? "pearl" : "secondary"}
                    size="xs"
                    onClick={() =>
                      setSelected(selected === item.id ? "" : item.id)
                    }
                  >
                    {selected === item.id
                      ? "Hide relations"
                      : "Inspect relations"}
                  </CandyButton>
                </div>
              </div>
            )}

            {item.view === "test" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold text-neutral-950">
                    {item.name}
                  </span>
                  <span className="text-muted text-xs">{item.framework}</span>
                </div>
                <p className="text-xs text-neutral-600">
                  Mode: {item.mode}{" "}
                  {item.parameterized ? "· parameterized" : ""}
                </p>
                <div className="pt-2">
                  <CandyButton
                    type="button"
                    variant={selected === item.id ? "pearl" : "secondary"}
                    size="xs"
                    onClick={() =>
                      setSelected(selected === item.id ? "" : item.id)
                    }
                  >
                    {selected === item.id ? "Hide links" : "Inspect links"}
                  </CandyButton>
                </div>
              </div>
            )}

            {item.view === "coverage" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="max-w-xs truncate font-mono text-xs text-neutral-950">
                    {item.path}
                  </span>
                  <span className="text-muted text-xs">{item.format}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600">
                    {item.covered}/{item.total} {item.metric}
                  </span>
                  <span className="font-mono font-semibold text-neutral-800">
                    {Math.round((item.covered / (item.total || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-neutral-800"
                    style={{
                      width: `${Math.min(100, Math.round((item.covered / (item.total || 1)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="truncate font-mono text-[11px] text-neutral-600">
                  Report: {item.reportEvidence.path}:
                  {item.reportEvidence.startLine}
                </span>
              </div>
            )}

            {item.view === "dependency" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-semibold text-neutral-950">
                    {item.name}
                  </span>
                  <span className="text-muted text-xs">v{item.version}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-neutral-600">
                  <span>{item.provenance}</span>
                  <span className="font-mono text-[11px]">
                    {item.dev ? "development" : "production"}
                  </span>
                </div>
              </div>
            )}

            {item.view === "environment" && (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-sm font-semibold text-neutral-950">
                  {item.name}
                </span>
                <span className="text-xs text-neutral-600">
                  Source: {item.source}
                </span>
              </div>
            )}

            {"evidence" in item && (
              <span className="truncate border-t border-dotted border-neutral-300 pt-1 font-mono text-[11px] text-neutral-600">
                {item.evidence.path}:{item.evidence.startLine}–
                {item.evidence.endLine}
              </span>
            )}
          </div>
        ))}
      </div>

      {list.data && !list.data.items.length && (
        <p className="text-xs text-neutral-600">
          No matching evidence found. Refine query or check snapshot boundary
          diagnostics.
        </p>
      )}

      <div className="flex items-center justify-between border-t border-dotted border-neutral-300 pt-2">
        <CandyButton
          type="button"
          variant="secondary"
          size="xs"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          ← Previous
        </CandyButton>
        <span className="font-mono text-xs text-neutral-600">Page {page}</span>
        <CandyButton
          type="button"
          variant="secondary"
          size="xs"
          disabled={(list.data?.total ?? 0) <= page * 50}
          onClick={() => setPage(page + 1)}
        >
          Next →
        </CandyButton>
      </div>

      {(resource.loading || test.loading) && (
        <LoadingIndicator variant="inline" label="Loading evidence details…" />
      )}
      {resource.data && (
        <aside className="rounded-xl border border-dotted border-neutral-300 bg-white p-5">
          <h3 className="mb-2 text-sm font-bold text-neutral-950">
            Resource topology: {resource.data.resource.name}
          </h3>
          <ul className="flex flex-col gap-1.5 font-mono text-xs text-neutral-900">
            {resource.data.relations.map((edge) => (
              <li key={edge.id} className="truncate">
                {resource.data?.resources.find((r) => r.id === edge.sourceId)
                  ?.name ?? edge.sourceId}{" "}
                → <span className="text-neutral-900">{edge.kind}</span> →{" "}
                {resource.data?.resources.find((r) => r.id === edge.targetId)
                  ?.name ?? edge.targetId}{" "}
                <span className="text-neutral-600">
                  ({edge.evidence.path}:{edge.evidence.startLine})
                </span>
              </li>
            ))}
          </ul>
          {!resource.data.relations.length && (
            <p className="text-xs text-neutral-600">
              No supported resource relationships resolved.
            </p>
          )}
        </aside>
      )}

      {test.data && (
        <aside className="rounded-xl border border-neutral-500/30 bg-white p-5">
          <h3 className="mb-2 text-sm font-bold text-neutral-950">
            Test links: {test.data.test.name}
          </h3>
          <ul className="flex flex-col gap-1.5 font-mono text-xs text-neutral-900">
            {test.data.links.map((link) => (
              <li key={link.id} className="truncate">
                <span className="text-neutral-800">{link.kind}</span>:{" "}
                {link.symbolName} · target {link.targetEvidence.path}:
                {link.targetEvidence.startLine}
              </li>
            ))}
          </ul>
          {!test.data.links.length && (
            <p className="text-xs text-neutral-600">
              No supported source-symbol relationship resolved.
            </p>
          )}
        </aside>
      )}
    </section>
  );
}
