import { useState } from "react";
import { z } from "zod";
import { detailSchema } from "./api";
import { ExecutionGraph } from "./graph";
import { control } from "@/src/features/repositories/api";
export function FunctionInspector({
  detail,
  onSelect,
}: Readonly<{
  detail: z.infer<typeof detailSchema>;
  onSelect: (id: string) => void;
}>) {
  const [name, setName] = useState("");
  const values = detail.values.filter(
    (value) => !name || value.name.toLowerCase().includes(name.toLowerCase()),
  );
  const ids = new Set(values.map((value) => value.id));
  const flows = detail.flows.filter(
    (flow) => ids.has(flow.sourceId) || ids.has(flow.targetId),
  );
  const fn = detail.function;
  return (
    <section
      id="execution-inspector"
      className="flex min-w-0 flex-col gap-4 rounded-xl border border-dotted border-neutral-300 p-5"
    >
      <h2 className="text-xl font-semibold">Function inspector: {fn.name}</h2>
      <p className="text-sm">
        {fn.kind} · {fn.async ? "async" : "synchronous declaration"} ·
        Parameters: {fn.parameters.join(", ") || "none"}
      </p>
      <p className="text-sm break-all">
        Source: {fn.evidence.path}:{fn.evidence.startLine}–{fn.evidence.endLine}
      </p>
      {detail.truncated && (
        <p role="status">
          This inspector is bounded. Some control, call or value objects are
          omitted.
        </p>
      )}
      <h3 className="text-lg font-semibold">Calls and unresolved targets</h3>
      {!detail.calls.length && <p>No calls recorded for this function.</p>}
      <ul className="flex max-h-80 flex-col gap-2 overflow-auto">
        {detail.calls.map((call) => (
          <li
            key={call.id}
            className="rounded-lg border border-dotted border-neutral-300 p-3 text-sm"
          >
            <p className="break-all">
              {call.expression} · {call.kind} · {call.resolution}
            </p>
            <p>{call.reason}</p>
            <p>
              {call.evidence.path}:{call.evidence.startLine}
            </p>
            {call.targetId && (
              <button
                type="button"
                className={control}
                onClick={() => onSelect(call.targetId!)}
              >
                Inspect target
              </button>
            )}
          </li>
        ))}
      </ul>
      <h3 className="text-lg font-semibold">
        Execution path and branch viewer
      </h3>
      <p>
        Conditions, switch cases, loops and terminal returns describe possible
        control transitions. Opaque regions are explicitly marked unsupported.
        This is not a runtime trace.
      </p>
      <ExecutionGraph
        title="Control flow"
        nodes={detail.controlNodes.map((node) => ({
          id: node.id,
          name: node.label,
          kind: node.kind,
        }))}
        edges={detail.controlEdges.map((edge) => ({
          ...edge,
          label: edge.label,
        }))}
      />
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-left text-sm">
          <caption className="py-2 text-left font-semibold">
            Control transitions
          </caption>
          <thead>
            <tr>
              <th className="p-2">From</th>
              <th className="p-2">Decision</th>
              <th className="p-2">To</th>
            </tr>
          </thead>
          <tbody>
            {detail.controlEdges.map((edge) => (
              <tr
                key={edge.id}
                className="border-t border-dotted border-neutral-300"
              >
                <td className="p-2 break-all">
                  {detail.controlNodes.find((node) => node.id === edge.sourceId)
                    ?.label ?? "Outside bounded view"}
                </td>
                <td className="p-2">{edge.label}</td>
                <td className="p-2 break-all">
                  {detail.controlNodes.find((node) => node.id === edge.targetId)
                    ?.label ?? "Outside bounded view"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3 className="text-lg font-semibold">Intraprocedural data flow</h3>
      <p>
        Conservative local definition/read relationships. No interprocedural
        propagation, alias analysis, taint proof or solved loop-carried values
        is implied.
      </p>
      <label className="flex flex-col gap-2">
        <span>Find a local value</span>
        <input
          className={control}
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <ul className="grid max-h-64 gap-2 overflow-auto sm:grid-cols-2">
        {values.map((value) => (
          <li
            key={value.id}
            className="rounded-lg border border-dotted border-neutral-300 p-3 text-sm"
          >
            {value.name} · {value.kind} · line {value.evidence.startLine}
          </li>
        ))}
      </ul>
      {!values.length && <p>No matching local values.</p>}
      <ul className="flex max-h-64 flex-col gap-2 overflow-auto">
        {flows.map((flow) => {
          const source = detail.values.find(
              (value) => value.id === flow.sourceId,
            ),
            target = detail.values.find((value) => value.id === flow.targetId);
          return (
            <li key={flow.id} className="text-sm">
              {source?.name ?? "Outside view"} (line{" "}
              {source?.evidence.startLine ?? "?"}) →{" "}
              {target?.name ?? "Outside view"} (line{" "}
              {target?.evidence.startLine ?? "?"}) · {flow.kind}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
