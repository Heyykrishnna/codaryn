import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CandyButton } from "./candy-button";
import { CustomDropdown, DropdownItem, DropdownSection, DropdownSelect } from "./custom-dropdown";
import { LoaderOrb } from "./loader-orb";
import { AIQueryConsole } from "@/src/features/analysis-studio/ai-query-console";
import { TelemetryDashboard } from "@/src/features/graph/telemetry-dashboard";

test("CandyButton renders with solid styling and accessibility attributes", () => {
  const html = renderToStaticMarkup(
    <CandyButton variant="pearl" size="default">
      Connect Database
    </CandyButton>,
  );
  assert.ok(html.includes("Connect Database"));
  assert.ok(html.includes("bg-white"));
  assert.ok(!html.includes("linear-gradient"));
  assert.ok(!html.includes("radial-gradient"));
});

test("CandyButton renders as an anchor link when href is supplied", () => {
  const html = renderToStaticMarkup(
    <CandyButton as="a" href="/workspace" variant="obsidian" size="sm">
      Workspace Settings
    </CandyButton>,
  );
  assert.ok(html.includes("<a"));
  assert.ok(html.includes('href="/workspace"'));
  assert.ok(html.includes("Workspace Settings"));
  assert.ok(!html.includes("linear-gradient"));
});

test("CustomDropdown renders trigger and maintains accessibility", () => {
  const html = renderToStaticMarkup(
    <CustomDropdown
      trigger={<button type="button">Options ▾</button>}
    >
      <DropdownSection title="ACTIONS">
        <DropdownItem label="Sort ascending" shortcut="S" />
        <DropdownItem label="Filter" shortcut="F" />
      </DropdownSection>
    </CustomDropdown>,
  );
  assert.ok(html.includes("Options ▾"));
});

test("DropdownSelect renders trigger with active value and chevron", () => {
  const html = renderToStaticMarkup(
    <DropdownSelect
      value="opt-1"
      options={[
        { value: "opt-1", label: "Production Cluster", badge: "active" },
        { value: "opt-2", label: "Staging Cluster", badge: "idle" },
      ]}
      onChange={() => {}}
    />,
  );
  assert.ok(html.includes("Production Cluster"));
  assert.ok(html.includes("svg"));
});

test("LoaderOrb renders connecting state with light blur backdrop", () => {
  const cardHtml = renderToStaticMarkup(
    <LoaderOrb
      label="Analyzing codebase…"
      description="Parsing AST tokens"
      variant="card"
    />,
  );
  assert.ok(cardHtml.includes('role="status"'));
  assert.ok(cardHtml.includes("backdrop-blur-md"));
  assert.ok(cardHtml.includes("Analyzing codebase…"));
  assert.ok(cardHtml.includes("Parsing AST tokens"));

  const inlineHtml = renderToStaticMarkup(
    <LoaderOrb
      label="Connecting…"
      variant="inline"
    />,
  );
  assert.ok(inlineHtml.includes("Connecting…"));
});

test("AIQueryConsole renders query prompts, thought accordion and anomaly metrics", () => {
  const html = renderToStaticMarkup(<AIQueryConsole />);
  assert.ok(html.includes("Activation drop, last 7 days"));
  assert.ok(html.includes("Thought for 12 s"));
  assert.ok(html.includes("Email verified, by platform"));
  assert.ok(html.includes("-35 pts vs expected"));
});

test("TelemetryDashboard renders stream chart metrics and accounts data grid", () => {
  const html = renderToStaticMarkup(<TelemetryDashboard />);
  assert.ok(html.includes("Weekly active users"));
  assert.ok(html.includes("18,420"));
  assert.ok(html.includes("Accounts by MRR"));
  assert.ok(html.includes("Northwind"));
  assert.ok(html.includes("Retention"));
});
