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
    <section className="flex min-w-0 flex-col gap-6 rounded-2xl border border-[#242835] bg-[#13151d] p-6 shadow-xl">
      <div className="flex flex-col gap-1 border-b border-[#222532] pb-4">
        <h2 className="text-lg font-bold text-white">
          Infrastructure, tests and dependencies
        </h2>
        <p className="text-xs text-zinc-400">
          Source evidence describes static configuration and potential test calls. Coverage is imported from committed reports; freshness and execution are bounded.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 rounded-xl border border-[#262a37] bg-[#161821] p-1">
          {views.map((v) => (
            <button
              key={v}
              type="button"
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium capitalize transition-all select-none cursor-pointer",
                kind === v
                  ? "bg-white text-zinc-950 font-semibold shadow-[0_2px_0_0_#d4d4d8]"
                  : "text-zinc-400 hover:text-white hover:bg-[#202330]",
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

        <div className="flex min-w-[16rem] flex-1 max-w-md items-center rounded-lg border border-[#2b2f3d] bg-[#14161f] px-3 py-1.5 text-xs">
          <svg className="h-4 w-4 text-zinc-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full bg-transparent text-white placeholder-zinc-500 outline-none"
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
        <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {list.loading && (
        <div className="text-xs text-zinc-400 py-4 font-mono">
          Loading {kind} evidence…
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {list.data?.items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex flex-col justify-between gap-3 rounded-xl border p-4 transition-all duration-150",
              selected === item.id
                ? "border-blue-500/50 bg-[#191d29]"
                : "border-[#252936] bg-[#161821] hover:border-[#383e52]",
            )}
          >
            {item.view === "resource" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white truncate">
                    {item.name}
                  </span>
                  <span className="rounded bg-[#202432] px-2 py-0.5 text-[10px] font-mono text-blue-400 border border-blue-500/20">
                    {item.kind}
                  </span>
                </div>
                {item.details.length > 0 && (
                  <ul className="text-xs text-zinc-400 flex flex-col gap-0.5">
                    {item.details.map((detail) => (
                      <li key={detail} className="truncate">• {detail}</li>
                    ))}
                  </ul>
                )}
                <div className="pt-2">
                  <CandyButton
                    type="button"
                    variant={selected === item.id ? "pearl" : "secondary"}
                    size="xs"
                    onClick={() => setSelected(selected === item.id ? "" : item.id)}
                  >
                    {selected === item.id ? "Hide relations" : "Inspect relations"}
                  </CandyButton>
                </div>
              </div>
            )}

            {item.view === "test" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white truncate">
                    {item.name}
                  </span>
                  <span className="rounded bg-[#202432] px-2 py-0.5 text-[10px] font-mono text-teal-400 border border-teal-500/20">
                    {item.framework}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Mode: {item.mode} {item.parameterized ? "· parameterized" : ""}
                </p>
                <div className="pt-2">
                  <CandyButton
                    type="button"
                    variant={selected === item.id ? "pearl" : "secondary"}
                    size="xs"
                    onClick={() => setSelected(selected === item.id ? "" : item.id)}
                  >
                    {selected === item.id ? "Hide links" : "Inspect links"}
                  </CandyButton>
                </div>
              </div>
            )}

            {item.view === "coverage" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white truncate max-w-xs">
                    {item.path}
                  </span>
                  <span className="rounded bg-[#202432] px-2 py-0.5 text-[10px] font-mono text-purple-400">
                    {item.format}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    {item.covered}/{item.total} {item.metric}
                  </span>
                  <span className="font-mono text-emerald-400 font-semibold">
                    {Math.round((item.covered / (item.total || 1)) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#202432] overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.round((item.covered / (item.total || 1)) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] font-mono text-zinc-500 truncate">
                  Report: {item.reportEvidence.path}:{item.reportEvidence.startLine}
                </span>
              </div>
            )}

            {item.view === "dependency" && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white truncate">
                    {item.name}
                  </span>
                  <span className="rounded bg-[#202432] px-2 py-0.5 text-[10px] font-mono text-zinc-300">
                    v{item.version}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{item.provenance}</span>
                  <span className="font-mono text-[11px]">
                    {item.dev ? "development" : "production"}
                  </span>
                </div>
              </div>
            )}

            {item.view === "environment" && (
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-white font-mono">
                  {item.name}
                </span>
                <span className="text-xs text-zinc-400">Source: {item.source}</span>
              </div>
            )}

            {"evidence" in item && (
              <span className="text-[11px] font-mono text-zinc-500 truncate pt-1 border-t border-[#222532]">
                {item.evidence.path}:{item.evidence.startLine}–{item.evidence.endLine}
              </span>
            )}
          </div>
        ))}
      </div>

      {list.data && !list.data.items.length && (
        <p className="text-xs text-zinc-500">
          No matching evidence found. Refine query or check snapshot boundary diagnostics.
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#222532]">
        <CandyButton
          type="button"
          variant="secondary"
          size="xs"
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
        >
          ← Previous
        </CandyButton>
        <span className="text-xs font-mono text-zinc-400">Page {page}</span>
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

      {resource.data && (
        <aside className="rounded-xl border border-blue-500/30 bg-[#141824] p-5">
          <h3 className="text-sm font-bold text-white mb-2">
            Resource topology: {resource.data.resource.name}
          </h3>
          <ul className="flex flex-col gap-1.5 text-xs font-mono text-zinc-300">
            {resource.data.relations.map((edge) => (
              <li key={edge.id} className="truncate">
                {resource.data?.resources.find((r) => r.id === edge.sourceId)?.name ?? edge.sourceId}{" "}
                → <span className="text-blue-400">{edge.kind}</span> →{" "}
                {resource.data?.resources.find((r) => r.id === edge.targetId)?.name ?? edge.targetId}{" "}
                <span className="text-zinc-500">
                  ({edge.evidence.path}:{edge.evidence.startLine})
                </span>
              </li>
            ))}
          </ul>
          {!resource.data.relations.length && (
            <p className="text-xs text-zinc-500">No supported resource relationships resolved.</p>
          )}
        </aside>
      )}

      {test.data && (
        <aside className="rounded-xl border border-teal-500/30 bg-[#121c1f] p-5">
          <h3 className="text-sm font-bold text-white mb-2">
            Test links: {test.data.test.name}
          </h3>
          <ul className="flex flex-col gap-1.5 text-xs font-mono text-zinc-300">
            {test.data.links.map((link) => (
              <li key={link.id} className="truncate">
                <span className="text-teal-400">{link.kind}</span>: {link.symbolName} · target{" "}
                {link.targetEvidence.path}:{link.targetEvidence.startLine}
              </li>
            ))}
          </ul>
          {!test.data.links.length && (
            <p className="text-xs text-zinc-500">No supported source-symbol relationship resolved.</p>
          )}
        </aside>
      )}
    </section>
  );
}
