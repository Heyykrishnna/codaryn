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

interface MentionTable {
  name: string;
  rows: string;
}

const availableTables: MentionTable[] = [
  { name: "signups", rows: "12.4k rows" },
  { name: "events", rows: "2.1M rows" },
  { name: "sessions", rows: "418k rows" },
  { name: "workspaces", rows: "3.2k rows" },
];

export function AIQueryConsole() {
  const [model, setModel] = useState("Probe 2");
  const [thoughtOpen, setThoughtOpen] = useState(false);
  const [prompt, setPrompt] = useState("Break it down by @signups channel");
  const [vsLastWeek, setVsLastWeek] = useState(true);
  const [dateRange, setDateRange] = useState("Last 30 days");
  const [showMentionMenu, setShowMentionMenu] = useState(false);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-[#242835] bg-[#12141c] p-5 sm:p-6 shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#20232e] pb-4">
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold text-sm">✦</span>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Activation drop, last 7 days
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <CustomDropdown
            align="right"
            trigger={
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-lg border border-[#2b2f3d] bg-[#161822] px-2.5 py-1 text-xs text-zinc-300 hover:bg-[#1d202c] transition-colors cursor-pointer"
              >
                <span>{model}</span>
                <span className="text-[10px] text-zinc-500">▾</span>
              </button>
            }
          >
            <DropdownSection title="REASONING MODEL">
              <DropdownItem
                label="Probe 2 (Standard)"
                active={model === "Probe 2"}
                badge="Default"
                onClick={() => setModel("Probe 2")}
              />
              <DropdownItem
                label="Probe 2.5 Flash"
                active={model === "Probe 2.5 Flash"}
                badge="Fast"
                onClick={() => setModel("Probe 2.5 Flash")}
              />
              <DropdownItem
                label="Probe Deep Reasoning"
                active={model === "Probe Deep Reasoning"}
                badge="Pro"
                onClick={() => setModel("Probe Deep Reasoning")}
              />
            </DropdownSection>
          </CustomDropdown>

          <CandyButton variant="ghost" size="icon" aria-label="Export insight">
            <svg
              className="h-4 w-4 text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </CandyButton>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="max-w-md rounded-2xl bg-[#1d202b] px-4 py-2.5 text-xs text-zinc-200 border border-[#2a2f3f] leading-relaxed shadow-sm">
          Why did activation drop last week?
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-[#222533] bg-[#151722] p-4 text-xs text-zinc-300">
        <button
          type="button"
          onClick={() => setThoughtOpen(!thoughtOpen)}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 transition-colors text-left select-none cursor-pointer"
        >
          <span
            className={cn(
              "font-mono text-[10px] transition-transform duration-150",
              thoughtOpen ? "rotate-90" : "",
            )}
          >
            ▶
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            Thought for 12 s · ran 3 queries · audited 142 types
          </span>
        </button>

        {thoughtOpen && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-[#222634] bg-[#0f1118] p-3 text-[11px] font-mono text-zinc-400 leading-relaxed">
            <p className="text-emerald-400">
              Query 1: SELECT count(*) FROM signups WHERE created_at &gt;= now() - interval &apos;7 days&apos;;
            </p>
            <p className="text-blue-400">
              Query 2: SELECT platform, count(*) FROM sessions GROUP BY platform;
            </p>
            <p className="text-amber-400">
              {"Query 3: MATCH (v:Release {version: '2.14'}) RETURN v.shipped_at;"}
            </p>
            <p className="text-zinc-500 pt-1 border-t border-[#1d202a]">
              Isolated anomaly: 35% regression localized to Android verification flow after v2.14 deploy.
            </p>
          </div>
        )}

        <p className="leading-relaxed text-zinc-200">
          Activation fell from 41% to 33%. Almost all of the loss is at email verification,
          and it sits in Android sign-ups immediately after the 2.14 release.
        </p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#272b3b] bg-[#1a1d29] px-2.5 py-1 text-[11px] font-mono text-zinc-300">
            <span>⊞</span> events
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#272b3b] bg-[#1a1d29] px-2.5 py-1 text-[11px] font-mono text-zinc-300">
            <span>⊞</span> signups
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#272b3b] bg-[#1a1d29] px-2.5 py-1 text-[11px] font-mono text-zinc-300">
            <span>📄</span> release_log
          </span>
        </div>

        <div className="relative mt-2 rounded-xl border border-[#242838] bg-[#0e1017] p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">
              Email verified, by platform
            </span>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> Android
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="h-2 w-2 rounded-full bg-purple-400" /> iOS
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="h-2 w-2 rounded-full bg-amber-400" /> Web
              </span>
            </div>
          </div>

          <div className="relative h-44 w-full">
            <svg
              className="h-full w-full overflow-visible"
              viewBox="0 0 500 150"
              preserveAspectRatio="none"
            >
              <line
                x1="0"
                y1="35"
                x2="500"
                y2="35"
                stroke="#1f2331"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="75"
                x2="500"
                y2="75"
                stroke="#1f2331"
                strokeWidth="1"
              />
              <line
                x1="0"
                y1="115"
                x2="500"
                y2="115"
                stroke="#1f2331"
                strokeWidth="1"
              />

              <path
                d="M 0,38 Q 150,37 250,38 T 500,36"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <path
                d="M 0,48 Q 150,46 250,49 T 500,47"
                fill="none"
                stroke="#a855f7"
                strokeWidth="2"
              />

              <path
                d="M 240,55 L 240,115 Q 350,118 500,122 L 500,55 Z"
                className="hatch-danger fill-red-500/10"
              />

              <path
                d="M 0,55 Q 120,54 240,55 Q 320,60 380,105 T 500,120"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
              />

              <circle cx="240" cy="55" r="4" fill="#ef4444" />
              <line
                x1="240"
                y1="55"
                x2="240"
                y2="140"
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
            </svg>

            <div className="absolute left-[48%] top-[25%] rounded bg-[#201418] border border-red-500/30 px-2 py-0.5 text-[10px] font-mono text-red-400">
              -35 pts vs expected
            </div>

            <div className="absolute left-[44%] bottom-1 text-[10px] font-mono text-zinc-400">
              2.14 shipped Oct 13
            </div>

            <div className="absolute right-2 top-4 text-[10px] font-mono text-amber-400">
              91% Web
            </div>
            <div className="absolute right-2 top-8 text-[10px] font-mono text-purple-400">
              85% iOS
            </div>
            <div className="absolute right-2 bottom-4 text-[10px] font-mono text-red-400 font-semibold">
              44% Android
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 border-t border-[#1d202b] pt-2">
            <span>Daily telemetry · Oct 6 – 19</span>
            <span>Activated 33% · was 41%</span>
          </div>
        </div>

        <p className="text-zinc-300 leading-relaxed">
          The 2.14 build opened a race condition: 28% of Android users never receive
          the verification callback. Rolling back the auth middleware will recover most of the drop.
        </p>
      </div>

      <div className="relative flex flex-col gap-2 rounded-2xl border border-[#2b2f3e] bg-[#151722] p-2.5 shadow-xl">
        {showMentionMenu && (
          <div className="absolute bottom-full left-4 mb-2 w-64 rounded-xl border border-[#2e3344] bg-[#161823] p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
            <span className="block px-2.5 py-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
              Tables
            </span>
            {availableTables.map((t) => (
              <button
                key={t.name}
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left text-zinc-300 hover:bg-[#202432] hover:text-white transition-colors cursor-pointer"
                onClick={() => {
                  setPrompt((prev) => `${prev} @${t.name} `);
                  setShowMentionMenu(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">⊞</span>
                  <span className="font-mono">{t.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-zinc-500">
                    {t.rows}
                  </span>
                  <span className="text-[10px] text-zinc-600">↵</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask an architectural question or break down by @table…"
          className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none"
        />

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#20232e] pt-2 px-1">
          <div className="flex items-center gap-1.5">
            <CandyButton
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Add table mention"
              onClick={() => setShowMentionMenu(!showMentionMenu)}
            >
              <span className="text-sm font-bold text-zinc-400">+</span>
            </CandyButton>

            <CandyButton
              type="button"
              variant="ghost"
              size="icon"
              aria-label="View format"
            >
              <svg
                className="h-3.5 w-3.5 text-zinc-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h7"
                />
              </svg>
            </CandyButton>

            <CustomDropdown
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg border border-[#2b2f3d] bg-[#181a25] px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-[#202330] transition-colors cursor-pointer"
                >
                  <span>📅</span>
                  <span>{dateRange}</span>
                  <span className="text-[10px] text-zinc-500">▾</span>
                </button>
              }
            >
              <DropdownSection title="TIME RANGE">
                {["Last 7 days", "Last 30 days", "Last 90 days", "Year to date"].map(
                  (range) => (
                    <DropdownItem
                      key={range}
                      label={range}
                      active={dateRange === range}
                      onClick={() => setDateRange(range)}
                    />
                  ),
                )}
              </DropdownSection>
            </CustomDropdown>

            <button
              type="button"
              onClick={() => setVsLastWeek(!vsLastWeek)}
              className="flex items-center gap-2 rounded-lg border border-[#2b2f3d] bg-[#181a25] px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-[#202330] transition-colors cursor-pointer select-none"
            >
              <span>vs last week</span>
              <span
                className={cn(
                  "flex h-3.5 w-6 items-center rounded-full p-0.5 transition-colors",
                  vsLastWeek ? "bg-blue-600 justify-end" : "bg-[#272b38] justify-start",
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <CandyButton
              type="button"
              variant="pearl"
              size="icon"
              aria-label="Send query"
              className="rounded-full"
            >
              <span className="text-sm font-bold">↑</span>
            </CandyButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIQueryConsole;
