"use client";
import React, { useState } from "react";
import type { SymbolInventoryResponse } from "@codaryn/contracts";

export function SymbolExplorer({
  symbols,
}: Readonly<{
  symbols: SymbolInventoryResponse;
}>) {
  const [tab, setTab] = useState<
    "functions" | "classes" | "interfaces" | "types" | "importsExports"
  >("functions");
  const [filter, setFilter] = useState("");

  const tabs = [
    { id: "functions", label: `Functions (${symbols.functions.length})` },
    { id: "classes", label: `Classes (${symbols.classes.length})` },
    { id: "interfaces", label: `Interfaces (${symbols.interfaces.length})` },
    { id: "types", label: `Types (${symbols.types.length})` },
    {
      id: "importsExports",
      label: `Imports/Exports (${symbols.importsExports.length})`,
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dotted border-neutral-200 bg-white p-5 shadow-xs">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-neutral-900 uppercase">
          Extracted Symbol Inventory
        </h3>
        <div>
          <label htmlFor="symbol-search-input" className="sr-only">
            Search symbols
          </label>
          <input
            id="symbol-search-input"
            type="search"
            placeholder="Search symbol name..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border border-dotted border-neutral-300 px-3 py-1.5 text-xs text-neutral-900 focus:border-neutral-500 focus:outline-hidden"
          />
        </div>
      </div>

      <div className="border-b border-dotted border-neutral-200">
        <nav className="flex space-x-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-1 py-2 text-xs font-medium whitespace-nowrap ${
                tab === t.id
                  ? "border-neutral-500 text-neutral-800"
                  : "border-transparent text-neutral-600 hover:border-neutral-300 hover:text-neutral-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-x-auto">
        {tab === "functions" && (
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-dotted border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Signature</th>
                <th className="px-3 py-2.5">Modifiers</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-neutral-200">
              {symbols.functions
                .filter((fn) =>
                  fn.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((fn) => (
                  <tr key={fn.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 font-mono font-medium text-neutral-900">
                      {fn.parentName ? `${fn.parentName}.${fn.name}` : fn.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-neutral-600">
                      (
                      {fn.parameters
                        .map((p) => `${p.name}: ${p.type}`)
                        .join(", ")}
                      ) =&gt; {fn.returnType}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {fn.isAsync && (
                          <span className="text-3xs rounded-xs bg-neutral-100 px-1.5 py-0.5 text-neutral-800">
                            async
                          </span>
                        )}
                        {fn.modifiers.map((m) => (
                          <span
                            key={m}
                            className="text-3xs rounded-xs bg-neutral-100 px-1.5 py-0.5 text-neutral-600"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                      {fn.location.path}:{fn.location.startLine}:
                      {fn.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === "classes" && (
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-dotted border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase">
              <tr>
                <th className="px-3 py-2.5">Class</th>
                <th className="px-3 py-2.5">Heritage</th>
                <th className="px-3 py-2.5">Methods</th>
                <th className="px-3 py-2.5">Properties</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-neutral-200">
              {symbols.classes
                .filter((cls) =>
                  cls.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((cls) => (
                  <tr key={cls.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 font-mono font-medium text-neutral-900">
                      {cls.name}
                    </td>
                    <td className="px-3 py-2">
                      {cls.extends && <span>extends {cls.extends} </span>}
                      {cls.implements.length > 0 && (
                        <span>implements {cls.implements.join(", ")}</span>
                      )}
                      {!cls.extends && cls.implements.length === 0 && "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {cls.methods.length}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {cls.properties.length}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                      {cls.location.path}:{cls.location.startLine}:
                      {cls.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === "interfaces" && (
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-dotted border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase">
              <tr>
                <th className="px-3 py-2.5">Interface</th>
                <th className="px-3 py-2.5">Extends</th>
                <th className="px-3 py-2.5">Properties</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-neutral-200">
              {symbols.interfaces
                .filter((iface) =>
                  iface.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((iface) => (
                  <tr key={iface.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 font-mono font-medium text-neutral-900">
                      {iface.name}
                    </td>
                    <td className="px-3 py-2">
                      {iface.extends.join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {iface.properties.map((p) => p.name).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                      {iface.location.path}:{iface.location.startLine}:
                      {iface.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === "types" && (
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-dotted border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Definition</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-neutral-200">
              {symbols.types
                .filter((type) =>
                  type.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((type) => (
                  <tr key={type.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 font-mono font-medium text-neutral-900">
                      {type.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-neutral-600">
                      {type.type}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                      {type.location.path}:{type.location.startLine}:
                      {type.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === "importsExports" && (
          <table className="w-full text-left text-xs text-neutral-600">
            <thead className="border-b border-dotted border-neutral-200 bg-neutral-50 text-xs font-semibold text-neutral-700 uppercase">
              <tr>
                <th className="px-3 py-2.5">Kind</th>
                <th className="px-3 py-2.5">Module Specifier</th>
                <th className="px-3 py-2.5">Specifiers</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dotted divide-neutral-200">
              {symbols.importsExports
                .filter((ie) =>
                  ie.moduleSpecifier
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                )
                .map((ie) => (
                  <tr key={ie.id} className="hover:bg-neutral-50">
                    <td className="px-3 py-2 text-xs font-bold text-neutral-600 uppercase">
                      {ie.kind}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium text-neutral-900">
                      {ie.moduleSpecifier || "(self)"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {ie.specifiers.map((s) => s.name).join(", ") || "*"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-neutral-600">
                      {ie.location.path}:{ie.location.startLine}:
                      {ie.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
