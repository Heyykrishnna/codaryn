import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CandyButton } from "./candy-button";
import { DropdownSelect } from "./custom-dropdown";
import { LoadingIndicator } from "./loading-indicator";

test("CandyButton does not submit forms unless explicitly requested", () => {
  const html = renderToStaticMarkup(<CandyButton>Cancel</CandyButton>);
  assert.match(html, /type="button"/);
  assert.match(
    renderToStaticMarkup(<CandyButton type="submit">Save</CandyButton>),
    /type="submit"/,
  );
});

test("CandyButton preserves link navigation and removes disabled destinations", () => {
  const link = (
    <CandyButton as="a" href="/workspace">
      Workspace settings
    </CandyButton>
  );
  assert.match(renderToStaticMarkup(link), /href="\/workspace"/);
  const disabled = renderToStaticMarkup(
    <CandyButton as="a" href="/workspace" disabled>
      Workspace settings
    </CandyButton>,
  );
  assert.match(disabled, /aria-disabled="true"/);
  assert.doesNotMatch(disabled, /href=/);
});

test("DropdownSelect announces the field name, current value, and collapsed state", () => {
  const html = renderToStaticMarkup(
    <DropdownSelect
      label="Workspace"
      value="production"
      options={[{ value: "production", label: "Production" }]}
      onChange={() => {}}
    />,
  );
  assert.match(html, /aria-label="Workspace: Production"/);
  assert.match(html, /aria-expanded="false"/);
});

test("the initial loading announcement renders without client hydration", () => {
  const html = renderToStaticMarkup(
    <LoadingIndicator
      label="Loading analysis…"
      description="Fetching evidence"
    />,
  );
  assert.match(html, /role="status"/);
  assert.match(html, /Loading analysis…/);
  assert.match(html, /Fetching evidence/);
});
