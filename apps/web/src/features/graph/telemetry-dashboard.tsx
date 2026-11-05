"use client";

import React, { useState } from "react";
import { CandyButton } from "@/src/components/ui/candy-button";
import {
  CustomDropdown,
  DropdownItem,
  DropdownSection,
  DropdownSeparator,
} from "@/src/components/ui/custom-dropdown";
import { cn } from "@/lib/utils";

interface AccountRow {
  id: string;
  account: string;
  plan: "Enterprise" | "Growth" | "Starter";
  mrr: string;
  trend: "up" | "down" | "flat";
  seats: string;
  health: number;
  checked: boolean;
}

const initialAccounts: AccountRow[] = [
  {
    id: "1",
    account: "Northwind",
    plan: "Enterprise",
    mrr: "$48,200",
    trend: "up",
    seats: "88%",
    health: 96,
    checked: false,
  },
  {
    id: "2",
    account: "Halcyon Labs",
    plan: "Enterprise",
    mrr: "$41,750",
    trend: "up",
    seats: "92%",
    health: 94,
    checked: false,
  },
  {
    id: "3",
    account: "Marlow & Co",
    plan: "Growth",
    mrr: "$22,400",
    trend: "up",
    seats: "78%",
    health: 91,
    checked: true,
  },
  {
    id: "4",
    account: "Orbit Freight",
    plan: "Growth",
    mrr: "$19,980",
    trend: "up",
    seats: "64%",
    health: 88,
    checked: false,
  },
  {
    id: "5",
    account: "Pinecrest",
    plan: "Growth",
    mrr: "$17,120",
    trend: "flat",
    seats: "72%",
    health: 85,
    checked: false,
  },
  {
    id: "6",
    account: "Atlas Dental",
    plan: "Starter",
    mrr: "$9,860",
    trend: "flat",
    seats: "88%",
    health: 82,
    checked: false,
  },
  {
    id: "7",
    account: "Kettle & Pine",
    plan: "Starter",
    mrr: "$8,410",
    trend: "down",
    seats: "31%",
    health: 65,
    checked: false,
  },
];

export function TelemetryDashboard() {
  const [chartType, setChartType] = useState<
    "line" | "bars" | "stream" | "dots"
  >("stream");
  const [activeTab, setActiveTab] = useState<"Table" | "Chart" | "SQL">(
    "Table",
  );
  const [timeMode, setTimeMode] = useState<"W" | "M">("W");
  const [accounts, setAccounts] = useState<AccountRow[]>(initialAccounts);
  const [filterTags, setFilterTags] = useState<string[]>([
    "Owner: Kemal",
    "MRR > $5k",
  ]);

  const toggleAccount = (id: string) => {
    setAccounts((prev) =>
      prev.map((acc) =>
        acc.id === id ? { ...acc, checked: !acc.checked } : acc,
      ),
    );
  };

  const removeFilter = (tag: string) => {
    setFilterTags((prev) => prev.filter((t) => t !== tag));
  };

  const selectedCount = accounts.filter((a) => a.checked).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#242835] bg-[#12141c] p-5 shadow-xl lg:col-span-4">
          <div className="flex items-center justify-between border-b border-[#20232e] pb-3">
            <span className="text-sm font-bold text-white">Chart settings</span>
            <span className="font-mono text-xs text-zinc-500">
              Edited by Probe
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Chart type
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-[#262a37] bg-[#161821] p-1">
              {[
                { type: "line", label: "Line" },
                { type: "bars", label: "Bars" },
                { type: "stream", label: "Stream" },
                { type: "dots", label: "Dots" },
              ].map((c) => (
                <button
                  key={c.type}
                  type="button"
                  onClick={() => setChartType(c.type as typeof chartType)}
                  className={cn(
                    "flex cursor-pointer flex-col items-center justify-center rounded-lg py-1.5 text-xs font-medium transition-all select-none",
                    chartType === c.type
                      ? "bg-white font-semibold text-zinc-950 shadow-[0_2px_0_0_#d4d4d8]"
                      : "text-zinc-400 hover:bg-[#202330] hover:text-white",
                  )}
                >
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Metric
            </label>
            <div className="flex items-center justify-between rounded-lg border border-[#2b2f3d] bg-[#161821] px-3 py-1.5 text-xs text-zinc-200">
              <span className="truncate">Weekly active users</span>
              <span className="rounded bg-[#202432] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                events ▾
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                Series
              </label>
              <span className="font-mono text-[10px] text-zinc-500">
                3 of 3 shown
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between rounded-lg border border-[#222533] bg-[#151722] px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-purple-500" />
                  <span className="font-medium text-white">Enterprise</span>
                </div>
                <span className="font-mono text-xs text-zinc-400">7.8k 👁</span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-[#222533] bg-[#151722] px-3 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-teal-500" />
                  <span className="font-medium text-white">Growth</span>
                </div>
                <span className="font-mono text-xs text-zinc-400">6.1k 👁</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-[#20232e] pt-2">
            <label className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
              Palette Shading (Solid)
            </label>
            <div className="grid grid-cols-7 gap-1.5">
              {[
                "#7c3aed",
                "#a855f7",
                "#ec4899",
                "#f43f5e",
                "#f97316",
                "#eab308",
                "#84cc16",
                "#10b981",
                "#06b6d4",
                "#3b82f6",
                "#6366f1",
                "#64748b",
                "#ffffff",
                "#0d0e12",
              ].map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`Color ${color}`}
                  style={{ backgroundColor: color }}
                  className="h-6 w-full cursor-pointer rounded-md border border-[#272b38] transition-transform hover:scale-105"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#20232e] pt-3">
            <CandyButton type="button" variant="outline" size="sm">
              Reset
            </CandyButton>
            <CandyButton type="button" variant="pearl" size="sm">
              Apply
            </CandyButton>
          </div>
        </div>

        <div className="flex flex-col gap-6 rounded-2xl border border-[#242835] bg-[#12141c] p-6 shadow-xl lg:col-span-8">
          <div className="flex items-center justify-between border-b border-[#20232e] pb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Weekly active users
              </h3>
              <p className="text-xs text-zinc-400">
                Split by plan · 3-week smoothing
              </p>
            </div>
            <div className="flex items-center gap-2">
              <CandyButton variant="ghost" size="icon" aria-label="Copy">
                <span className="text-xs">⎘</span>
              </CandyButton>
              <CandyButton variant="ghost" size="icon" aria-label="Share">
                <span className="text-xs">↑</span>
              </CandyButton>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-2xl font-extrabold text-white">
                18,420
              </span>
              <span className="text-[11px] text-zinc-400">
                WAU this week{" "}
                <span className="font-mono font-medium text-blue-400">
                  +6.2%
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-2xl font-extrabold text-white">
                2
              </span>
              <span className="text-[11px] text-zinc-400">
                Anomalies{" "}
                <span className="font-mono font-medium text-red-400">
                  Sep 1, Oct 13
                </span>
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-mono text-2xl font-extrabold text-white">
                21.6k
              </span>
              <span className="text-[11px] text-zinc-400">
                Forecast Nov 16 ±1.4k
              </span>
            </div>
          </div>

          <div className="relative flex h-48 w-full flex-col justify-between rounded-xl border border-[#222533] bg-[#0d0e14] p-4">
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 600 120"
              preserveAspectRatio="none"
            >
              <path
                d="M 0,20 Q 150,5 300,25 T 450,20 L 600,22 L 600,60 L 450,55 Q 300,65 150,45 Z"
                fill="#7c3aed"
                opacity="0.85"
              />
              <path
                d="M 0,60 Q 150,45 300,65 T 450,55 L 600,60 L 600,95 L 450,88 Q 300,95 150,80 Z"
                fill="#0d9488"
                opacity="0.9"
              />
              <path
                d="M 0,95 Q 150,80 300,95 T 450,88 L 600,95 L 600,120 L 0,120 Z"
                fill="#d97706"
                opacity="0.9"
              />

              <rect
                x="450"
                y="0"
                width="150"
                height="120"
                className="hatch-pattern fill-white/5"
              />

              <circle cx="280" cy="40" r="3.5" fill="#ef4444" />
              <circle cx="450" cy="20" r="3.5" fill="#ef4444" />
            </svg>

            <div className="flex items-center justify-between border-t border-[#1d202a] pt-2 font-mono text-[10px] text-zinc-500">
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov (Forecast)</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2 text-xs font-medium text-zinc-400">
              <span>Plan</span>
              <span>WAU</span>
              <span>Change</span>
              <span className="w-24 text-right">Share</span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#232734] bg-[#161821] px-3 py-2 text-xs">
              <span className="flex items-center gap-2 font-medium text-white">
                <span className="h-2.5 w-2.5 rounded-sm bg-purple-500" />{" "}
                Enterprise
              </span>
              <span className="font-mono text-zinc-200">7,840</span>
              <span className="font-mono font-semibold text-blue-400">
                +9.1%
              </span>
              <div className="flex w-24 items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#202432]">
                  <div
                    className="h-full rounded-full bg-purple-500"
                    style={{ width: "43%" }}
                  />
                </div>
                <span className="font-mono text-[11px] text-zinc-400">43%</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#232734] bg-[#161821] px-3 py-2 text-xs">
              <span className="flex items-center gap-2 font-medium text-white">
                <span className="h-2.5 w-2.5 rounded-sm bg-teal-500" /> Growth
              </span>
              <span className="font-mono text-zinc-200">6,120</span>
              <span className="font-mono font-semibold text-blue-400">
                +4.8%
              </span>
              <div className="flex w-24 items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#202432]">
                  <div
                    className="h-full rounded-full bg-teal-500"
                    style={{ width: "33%" }}
                  />
                </div>
                <span className="font-mono text-[11px] text-zinc-400">33%</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[#232734] bg-[#161821] px-3 py-2 text-xs">
              <span className="flex items-center gap-2 font-medium text-white">
                <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Starter
              </span>
              <span className="font-mono text-zinc-200">4,460</span>
              <span className="font-mono font-semibold text-blue-400">
                +3.2%
              </span>
              <div className="flex w-24 items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#202432]">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: "24%" }}
                  />
                </div>
                <span className="font-mono text-[11px] text-zinc-400">24%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#242835] bg-[#12141c] p-6 shadow-xl lg:col-span-4">
          <div className="flex items-center justify-between border-b border-[#20232e] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white">Retention</h3>
              <p className="text-xs text-zinc-400">Weekly cohorts</p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-[#272b38] bg-[#161822] p-0.5">
              <button
                type="button"
                onClick={() => setTimeMode("W")}
                className={cn(
                  "cursor-pointer rounded px-2 py-0.5 text-xs font-semibold select-none",
                  timeMode === "W" ? "bg-white text-zinc-950" : "text-zinc-400",
                )}
              >
                W
              </button>
              <button
                type="button"
                onClick={() => setTimeMode("M")}
                className={cn(
                  "cursor-pointer rounded px-2 py-0.5 text-xs font-semibold select-none",
                  timeMode === "M" ? "bg-white text-zinc-950" : "text-zinc-400",
                )}
              >
                M
              </button>
            </div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-mono text-3xl font-extrabold text-white">
              24%
            </span>
            <span className="text-xs text-zinc-400">
              still active at week 8
            </span>
          </div>

          <div className="relative flex h-28 w-full flex-col justify-end rounded-xl border border-[#222533] bg-[#0d0e14] p-3">
            <div className="flex h-full w-full items-end gap-1">
              {[80, 68, 54, 46, 38, 31, 27, 24].map((h, i) => (
                <div
                  key={i}
                  className="flex h-full flex-1 flex-col justify-end"
                >
                  <div
                    className="w-full rounded-t bg-blue-500"
                    style={{ height: `${h}%` }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-zinc-400">
              <span>Week 1 average</span>
              <span className="font-mono font-semibold text-white">66%</span>
            </div>
            <div className="flex items-center justify-between text-zinc-400">
              <span>Best cohort</span>
              <span className="font-mono font-semibold text-emerald-400">
                Sep 29 ■
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-[#242835] bg-[#12141c] p-6 shadow-xl lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#20232e] pb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Accounts by MRR
              </h3>
              <p className="text-xs text-zinc-400">1,284 rows · ran 0.4 s</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-[#272b38] bg-[#161822] p-0.5 text-xs">
                {(["Table", "Chart", "SQL"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors select-none",
                      activeTab === tab
                        ? "bg-white font-semibold text-zinc-950 shadow-sm"
                        : "text-zinc-400 hover:text-white",
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <CandyButton variant="ghost" size="icon" aria-label="Export">
                <span className="text-xs">↑</span>
              </CandyButton>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2b2f3d] bg-[#161821] px-2.5 py-1 font-mono text-xs text-zinc-300"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => removeFilter(tag)}
                  className="ml-1 cursor-pointer text-zinc-500 hover:text-white"
                >
                  ×
                </button>
              </span>
            ))}
            <button
              type="button"
              className="cursor-pointer rounded-lg border border-dashed border-[#2b2f3d] px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            >
              + Filter
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#222533]">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="border-b border-[#222533] bg-[#151722] text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                <tr>
                  <th className="w-8 p-3">
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      className="rounded accent-blue-600"
                    />
                  </th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3 text-right">↓ MRR</th>
                  <th className="p-3 text-center">Trend</th>
                  <th className="p-3">
                    <CustomDropdown
                      trigger={
                        <button
                          type="button"
                          className="flex cursor-pointer items-center gap-1 text-zinc-300 hover:text-white"
                        >
                          <span>Seats</span>
                          <span>▾</span>
                        </button>
                      }
                    >
                      <DropdownSection>
                        <DropdownItem
                          icon={<span>↑</span>}
                          label="Sort ascending"
                        />
                        <DropdownItem
                          icon={<span>↓</span>}
                          label="Sort descending"
                        />
                        <DropdownItem
                          icon={<span>≡</span>}
                          label="Filter"
                          shortcut="F"
                        />
                        <DropdownItem
                          icon={<span>⊞</span>}
                          label="Group by plan"
                        />
                        <DropdownItem
                          icon={<span>👁</span>}
                          label="Hide column"
                        />
                      </DropdownSection>
                      <DropdownSeparator />
                      <DropdownItem
                        variant="accent"
                        icon={<span>✦</span>}
                        label="Ask about Seats"
                      />
                    </CustomDropdown>
                  </th>
                  <th className="p-3 text-right">Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e212c] bg-[#12141c]">
                {accounts.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "transition-colors hover:bg-[#181a24]",
                      row.checked ? "bg-[#181c26]" : "",
                    )}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={row.checked}
                        onChange={() => toggleAccount(row.id)}
                        aria-label={`Select ${row.account}`}
                        className="rounded accent-blue-600"
                      />
                    </td>
                    <td className="p-3 font-semibold text-white">
                      {row.account}
                    </td>
                    <td className="p-3">
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 text-[10px] font-semibold",
                          row.plan === "Enterprise"
                            ? "border border-purple-500/30 bg-purple-500/15 text-purple-300"
                            : row.plan === "Growth"
                              ? "border border-teal-500/30 bg-teal-500/15 text-teal-300"
                              : "border border-amber-500/30 bg-amber-500/15 text-amber-300",
                        )}
                      >
                        {row.plan}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-100">
                      {row.mrr}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={cn(
                          "font-mono text-xs",
                          row.trend === "up"
                            ? "text-blue-400"
                            : row.trend === "down"
                              ? "text-red-400"
                              : "text-zinc-500",
                        )}
                      >
                        {row.trend === "up"
                          ? "↗"
                          : row.trend === "down"
                            ? "↘"
                            : "→"}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-zinc-300">{row.seats}</td>
                    <td className="p-3 text-right">
                      <span
                        className={cn(
                          "font-mono text-xs font-semibold",
                          row.health > 90
                            ? "text-emerald-400"
                            : row.health > 80
                              ? "text-blue-400"
                              : "text-amber-400",
                        )}
                      >
                        {row.health}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#20232e] pt-2 text-xs text-zinc-400">
            <span>
              {selectedCount} selected · showing {accounts.length} of 1,284
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-zinc-500">
                ↑ ↓ Navigate
              </span>
              <CandyButton type="button" variant="pearl" size="xs">
                Export CSV
              </CandyButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TelemetryDashboard;
