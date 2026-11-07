"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  architectureRulesSchema,
  type ArchitectureAtlas,
  type AtlasLayer,
  type AtlasNode,
} from "@codaryn/contracts";
import { AtlasCanvas } from "./atlas-canvas";
import { atlasFindings } from "./atlas-findings";
import { CandyButton } from "@/src/components/ui/candy-button";
import { DropdownSelect } from "@/src/components/ui/custom-dropdown";
import { control } from "@/src/features/repositories/api";
import { workspaceRequest } from "@/src/lib/workspace-request";

const layers: Record<AtlasLayer, string> = {
  services: "Services",
  features: "Features",
  sequences: "API sequences",
  files: "File dependencies",
  functions: "Function flowcharts",
};
const layerIds: AtlasLayer[] = [
  "services",
  "features",
  "sequences",
  "files",
  "functions",
];

export function AtlasView({
  atlas,
  baseline,
  workspaceId,
  refresh,
}: {
  atlas: ArchitectureAtlas;
  baseline?: ArchitectureAtlas;
  workspaceId: string;
  refresh: () => void;
}) {
  const [view, setView] = useState<AtlasLayer | "health">("services");
  const [selection, setSelection] = useState("");
  const [group, setGroup] = useState("");
  const [search, setSearch] = useState("");
  const [ruleText, setRuleText] = useState("");
  const [rules, setRules] = useState<
    ReturnType<typeof architectureRulesSchema.parse>
  >({ rules: [] });
  const [ruleError, setRuleError] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [executionMessage, setExecutionMessage] = useState("");
  const findings = useMemo(
    () =>
      new Map(
        layerIds.map((layer) => [
          layer,
          atlasFindings(atlas.layers[layer], baseline?.layers[layer], rules),
        ]),
      ),
    [atlas, baseline, rules],
  );
  const graph = view === "health" ? undefined : atlas.layers[view];
  const activeFindings = view === "health" ? undefined : findings.get(view);
  const selected = graph?.nodes.find((node) => node.id === selection);
  const needle = search.trim().toLowerCase();
  const visible =
    graph?.nodes.filter(
      (node) =>
        (!group || group === node.group) &&
        (!needle ||
          `${node.title} ${node.path ?? ""}`.toLowerCase().includes(needle)),
    ) ?? [];
  const ids = new Set(visible.map((node) => node.id));
  const groups = [...(new Set(graph?.nodes.map((node) => node.group)) ?? [])];
  const url = new URLSearchParams({ workspaceId, jobId: atlas.jobId });

  function navigate(
    layer: AtlasLayer | "health",
    node?: AtlasNode,
    query = "",
  ) {
    setView(layer);
    setGroup(node?.group ?? "");
    setSelection(node?.id ?? "");
    setSearch(query);
  }

  async function requestExecution() {
    setRequesting(true);
    try {
      await workspaceRequest(
        "execution",
        "request",
        workspaceId,
        { jobId: atlas.jobId },
        true,
      );
      setExecutionMessage(
        "Extraction requested. Refresh the snapshot after the execution worker finishes.",
      );
    } catch (error) {
      setExecutionMessage(
        error instanceof Error
          ? error.message
          : "Unable to request execution evidence.",
      );
    } finally {
      setRequesting(false);
    }
  }

  function applyRules() {
    try {
      setRules(
        architectureRulesSchema.parse(JSON.parse(ruleText || '{"rules":[]}')),
      );
      setRuleError("");
    } catch {
      setRuleError(
        "Enter valid JSON with up to 50 rules. Each rule needs a name, kind, from path and to path.",
      );
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="font-medium break-all">
          {atlas.repositoryName}{" "}
          <span className="text-muted font-mono text-xs">
            {atlas.commitSha.slice(0, 12)}
          </span>
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/analysis?${url}`}
            className="underline underline-offset-4"
          >
            Analysis evidence
          </Link>
          <Link
            href={`/workbench?${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            API workbench
          </Link>
        </div>
      </div>
      <nav
        aria-label="Diagram layers"
        className="border-border flex flex-wrap gap-2 border-b border-dotted pb-3"
      >
        {layerIds.map((layer) => {
          const result = findings.get(layer);
          const delta = result
            ? result.addedNodes.length +
              result.removedNodes.length +
              result.addedEdges.length +
              result.removedEdges.length
            : 0;
          return (
            <CandyButton
              key={layer}
              aria-pressed={view === layer}
              variant={view === layer ? "pearl" : "secondary"}
              size="sm"
              onClick={() => navigate(layer)}
            >
              {layers[layer]}
              {delta > 0 ? ` · ${delta} changes` : ""}
            </CandyButton>
          );
        })}
        <CandyButton
          aria-pressed={view === "health"}
          variant={view === "health" ? "pearl" : "secondary"}
          size="sm"
          onClick={() => navigate("health")}
        >
          Code health
        </CandyButton>
      </nav>
      {view === "health" && (
        <section className="space-y-4" aria-label="Code health">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {Object.entries(atlas.health).map(([label, count]) => (
              <div
                key={label}
                className="border-border bg-card rounded-lg border border-dotted p-4"
              >
                <dt className="text-muted text-sm capitalize">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">
                  {count.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
          <Link
            href="/quality"
            className="text-sm underline underline-offset-4"
          >
            Open Quality explorer
          </Link>
        </section>
      )}
      {graph && (
        <section
          aria-label="Diagram and source inspector"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter nodes"
              aria-label="Filter diagram nodes"
              className={`${control} min-w-40 flex-1`}
            />
            <DropdownSelect
              label="Diagram group"
              searchable
              className="w-full sm:w-64"
              value={group}
              options={[
                { value: "", label: "All groups" },
                ...groups.map((label) => ({ value: label, label })),
              ]}
              onChange={(value) => {
                setGroup(value);
                setSelection("");
              }}
            />
          </div>
          <p className="text-muted text-xs">
            {visible.length} of {graph.nodes.length} diagram nodes.{" "}
            {graph.truncated ? "This preview is bounded. " : ""}
            {view === "services"
              ? "Repository units are inferred from directory layout. Arrows summarize detected imports."
              : "Arrows show static evidence. Dashed arrows indicate uncertain relationships."}
          </p>
          {baseline && activeFindings && (
            <p className="text-muted text-sm">
              Baseline comparison of the displayed samples.{" "}
              {activeFindings.addedNodes.length} added nodes,{" "}
              {activeFindings.removedNodes.length} removed nodes,{" "}
              {activeFindings.addedEdges.length} added links,{" "}
              {activeFindings.removedEdges.length} removed links.
            </p>
          )}
          {visible.length ? (
            <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_17rem]">
              <AtlasCanvas
                graph={{
                  ...graph,
                  nodes: visible,
                  edges: graph.edges.filter(
                    (edge) => ids.has(edge.source) && ids.has(edge.target),
                  ),
                }}
                selected={selection}
                marked={activeFindings?.marked ?? new Set()}
                select={(node) => setSelection(node.id)}
              />
              <aside
                aria-label="Node evidence"
                className="border-border bg-card min-w-0 space-y-3 rounded-xl border border-dotted p-4"
              >
                <h2 className="font-semibold">Evidence</h2>
                {!selected ? (
                  <p className="text-muted text-sm">
                    Select a node to inspect its source and connections.
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-medium break-words">
                      {selected.title}
                    </p>
                    <p className="text-muted font-mono text-xs break-all">
                      {selected.evidence
                        ? `${selected.evidence.path}:${selected.evidence.startLine}–${selected.evidence.endLine}`
                        : (selected.path ?? selected.kind)}
                    </p>
                    {view !== "files" && selected.path && (
                      <CandyButton
                        size="sm"
                        onClick={() =>
                          navigate("files", undefined, selected.path)
                        }
                      >
                        Find related files
                      </CandyButton>
                    )}
                    {view === "features" &&
                      atlas.layers.sequences.nodes.some(
                        (node) => node.id === selected.id,
                      ) && (
                        <CandyButton
                          size="sm"
                          onClick={() =>
                            navigate(
                              "sequences",
                              atlas.layers.sequences.nodes.find(
                                (node) => node.id === selected.id,
                              ),
                            )
                          }
                        >
                          Open sequence
                        </CandyButton>
                      )}
                    {view === "files" && selected.path && (
                      <CandyButton
                        size="sm"
                        onClick={() =>
                          navigate("functions", undefined, selected.path)
                        }
                      >
                        Find functions
                      </CandyButton>
                    )}
                    <ul className="max-h-64 space-y-2 overflow-auto text-xs">
                      {graph.edges
                        .filter(
                          (edge) =>
                            edge.source === selected.id ||
                            edge.target === selected.id,
                        )
                        .slice(0, 30)
                        .map((edge, index) => {
                          const outgoing = edge.source === selected.id;
                          const related = graph.nodes.find(
                            (node) =>
                              node.id ===
                              (outgoing ? edge.target : edge.source),
                          );
                          return (
                            <li
                              key={index}
                              className="border-border border-t border-dotted pt-2 break-words"
                            >
                              <button
                                type="button"
                                className="text-left underline underline-offset-4"
                                onClick={() => {
                                  if (related) {
                                    setSelection(related.id);
                                    setGroup(related.group);
                                    setSearch("");
                                  }
                                }}
                              >
                                {outgoing ? "To" : "From"} {related?.title}
                              </button>
                              <p className="text-muted">
                                {edge.label} · {edge.status.toLowerCase()}
                              </p>
                            </li>
                          );
                        })}
                    </ul>
                  </>
                )}
              </aside>
            </div>
          ) : (
            <div className="border-border bg-card space-y-3 rounded-xl border border-dotted p-5 text-sm">
              <p>
                {graph.nodes.length
                  ? "No nodes match the current filters."
                  : "This snapshot has no evidence for this layer."}
              </p>
              {view === "functions" && !atlas.executionReady && (
                <div className="flex flex-wrap items-center gap-3">
                  <CandyButton disabled={requesting} onClick={requestExecution}>
                    {requesting ? "Requesting…" : "Extract function flowcharts"}
                  </CandyButton>
                  <CandyButton onClick={refresh}>Refresh snapshot</CandyButton>
                  {executionMessage && (
                    <p role="status" className="text-muted">
                      {executionMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      )}
      <div className="grid gap-3 lg:grid-cols-2">
        <details className="border-border bg-card rounded-xl border border-dotted p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Knowledge map and guided tour
          </summary>
          <p className="text-muted mt-3 text-xs">
            Start with repository units, then review routes ranked by incoming
            imports to their source files.
          </p>
          <ul className="mt-3 max-h-52 space-y-2 overflow-auto text-sm">
            {atlas.layers.services.nodes.map((node) => (
              <li key={node.id}>
                <button
                  type="button"
                  onClick={() => navigate("services", node)}
                  className="text-left underline underline-offset-4"
                >
                  {node.title}
                </button>
              </li>
            ))}
          </ul>
          <ol className="border-border mt-3 space-y-2 border-t border-dotted pt-3 text-sm">
            {atlas.tour.map((stop) => {
              const route = atlas.layers.sequences.nodes.find(
                (node) => node.id === stop.nodeId,
              );
              return (
                route && (
                  <li key={stop.nodeId}>
                    <button
                      type="button"
                      onClick={() => navigate("sequences", route)}
                      className="text-left underline underline-offset-4"
                    >
                      {route.title}
                    </button>{" "}
                    <span className="text-muted text-xs">
                      · {stop.incomingImports} incoming imports
                    </span>
                  </li>
                )
              );
            })}
          </ol>
        </details>
        <details className="border-border bg-card rounded-xl border border-dotted p-4">
          <summary className="cursor-pointer text-sm font-semibold">
            Architecture rules and findings
          </summary>
          <label
            htmlFor="atlas-rules"
            className="text-muted mt-3 block text-xs"
          >
            JSON rules use exact paths or directory prefixes. Rules apply to
            relationship evidence in this preview.
          </label>
          <textarea
            id="atlas-rules"
            maxLength={20000}
            value={ruleText}
            onChange={(event) => setRuleText(event.target.value)}
            placeholder={
              '{"rules":[{"name":"UI cannot import storage","kind":"imports","from":"apps/web","to":"packages/database"}]}'
            }
            className={`${control} mt-2 min-h-24 w-full font-mono`}
          />
          <CandyButton size="sm" onClick={applyRules}>
            Check rules
          </CandyButton>
          {ruleError && (
            <p role="alert" className="mt-2 text-sm">
              {ruleError}
            </p>
          )}
          <ul className="mt-3 max-h-56 space-y-2 overflow-auto text-xs">
            {layerIds.flatMap((layer) =>
              (findings.get(layer)?.violations ?? [])
                .slice(0, 25)
                .map((finding, index) => (
                  <li
                    key={`${layer}:${index}`}
                    className="border-border border-t border-dotted pt-2 break-all"
                  >
                    <button
                      type="button"
                      onClick={() => navigate(layer, finding.source)}
                      className="text-left underline underline-offset-4"
                    >
                      {finding.name}
                    </button>
                    <p>
                      {finding.source.path} → {finding.target.path}
                    </p>
                    {finding.evidence && (
                      <p className="text-muted">
                        {finding.evidence.path}:{finding.evidence.startLine}
                      </p>
                    )}
                  </li>
                )),
            )}
          </ul>
        </details>
      </div>
    </div>
  );
}
