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
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold tracking-wider text-zinc-900 uppercase dark:text-zinc-100">
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
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs text-zinc-900 focus:border-indigo-500 focus:outline-hidden dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>

      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex space-x-4 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`border-b-2 px-1 py-2 text-xs font-medium whitespace-nowrap ${
                tab === t.id
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                  : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="overflow-x-auto">
        {tab === "functions" && (
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Signature</th>
                <th className="px-3 py-2.5">Modifiers</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {symbols.functions
                .filter((fn) =>
                  fn.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((fn) => (
                  <tr
                    key={fn.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-3 py-2 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {fn.parentName ? `${fn.parentName}.${fn.name}` : fn.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-400">
                      (
                      {fn.parameters
                        .map((p) => `${p.name}: ${p.type}`)
                        .join(", ")}
                      ) =&gt; {fn.returnType}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {fn.isAsync && (
                          <span className="text-3xs rounded-xs bg-indigo-50 px-1.5 py-0.5 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                            async
                          </span>
                        )}
                        {fn.modifiers.map((m) => (
                          <span
                            key={m}
                            className="text-3xs rounded-xs bg-zinc-100 px-1.5 py-0.5 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-2xs px-3 py-2 font-mono text-zinc-500">
                      {fn.location.path}:{fn.location.startLine}:
                      {fn.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === "classes" && (
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2.5">Class</th>
                <th className="px-3 py-2.5">Heritage</th>
                <th className="px-3 py-2.5">Methods</th>
                <th className="px-3 py-2.5">Properties</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {symbols.classes
                .filter((cls) =>
                  cls.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((cls) => (
                  <tr
                    key={cls.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-3 py-2 font-mono font-medium text-zinc-900 dark:text-zinc-100">
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
                    <td className="text-2xs px-3 py-2 font-mono text-zinc-500">
                      {cls.location.path}:{cls.location.startLine}:
                      {cls.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === "interfaces" && (
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2.5">Interface</th>
                <th className="px-3 py-2.5">Extends</th>
                <th className="px-3 py-2.5">Properties</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {symbols.interfaces
                .filter((iface) =>
                  iface.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((iface) => (
                  <tr
                    key={iface.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-3 py-2 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {iface.name}
                    </td>
                    <td className="px-3 py-2">
                      {iface.extends.join(", ") || "—"}
                    </td>
                    <td className="text-2xs px-3 py-2 font-mono">
                      {iface.properties.map((p) => p.name).join(", ") || "—"}
                    </td>
                    <td className="text-2xs px-3 py-2 font-mono text-zinc-500">
                      {iface.location.path}:{iface.location.startLine}:
                      {iface.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === "types" && (
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2.5">Name</th>
                <th className="px-3 py-2.5">Definition</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {symbols.types
                .filter((type) =>
                  type.name.toLowerCase().includes(filter.toLowerCase()),
                )
                .map((type) => (
                  <tr
                    key={type.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="px-3 py-2 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {type.name}
                    </td>
                    <td className="px-3 py-2 font-mono text-zinc-600 dark:text-zinc-400">
                      {type.type}
                    </td>
                    <td className="text-2xs px-3 py-2 font-mono text-zinc-500">
                      {type.location.path}:{type.location.startLine}:
                      {type.location.startColumn}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}

        {tab === "importsExports" && (
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-300">
            <thead className="text-2xs border-b border-zinc-200 bg-zinc-50 font-semibold text-zinc-700 uppercase dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2.5">Kind</th>
                <th className="px-3 py-2.5">Module Specifier</th>
                <th className="px-3 py-2.5">Specifiers</th>
                <th className="px-3 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {symbols.importsExports
                .filter((ie) =>
                  ie.moduleSpecifier
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                )
                .map((ie) => (
                  <tr
                    key={ie.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="text-2xs px-3 py-2 font-bold text-zinc-500 uppercase">
                      {ie.kind}
                    </td>
                    <td className="px-3 py-2 font-mono font-medium text-zinc-900 dark:text-zinc-100">
                      {ie.moduleSpecifier || "(self)"}
                    </td>
                    <td className="text-2xs px-3 py-2 font-mono">
                      {ie.specifiers.map((s) => s.name).join(", ") || "*"}
                    </td>
                    <td className="text-2xs px-3 py-2 font-mono text-zinc-500">
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
