import { test } from "node:test";
import { strict as assert } from "node:assert";
import { normalizeStudioConfiguration, studioDefaults } from "./studio.js";

test("dependencies and canonical ordering are deterministic", () => {
  const first = normalizeStudioConfiguration({
    ...studioDefaults,
    analyzers: ["react", "api", "react"],
    diagrams: ["architecture"],
  });
  const second = normalizeStudioConfiguration({
    ...studioDefaults,
    analyzers: ["api", "react"],
    diagrams: ["architecture"],
  });
  assert.deepEqual(first, second);
  assert.ok(first.analyzers.includes("typescript"));
  assert.ok(first.analyzers.includes("inventory"));
});
test("untrusted configuration and incompatible depth fail closed", () => {
  for (const patch of [
    { analyzers: ["unknown"] },
    { exclusions: ["../secret"] },
    { exclusions: ["/etc/passwd"] },
    { depth: "overview", diagrams: ["dataflow"] },
    { unexpected: true },
  ]) {
    assert.throws(() =>
      normalizeStudioConfiguration({ ...studioDefaults, ...patch }),
    );
  }
});

test("output requirements resolve analyzers and test-file compatibility is explicit", () => {
  const normalized = normalizeStudioConfiguration({
    ...studioDefaults,
    documents: ["security-report", "api-reference", "schema-reference"],
  });
  assert.deepEqual(normalized.analyzers, [
    "api",
    "infrastructure",
    "inventory",
    "schema",
    "security",
    "typescript",
  ]);
  assert.throws(
    () =>
      normalizeStudioConfiguration({
        ...studioDefaults,
        analyzers: ["testing"],
      }),
    /test files/,
  );
  assert.throws(() =>
    normalizeStudioConfiguration({
      ...studioDefaults,
      exclusions: Array.from({ length: 101 }, () => "dist/**"),
    }),
  );
});
