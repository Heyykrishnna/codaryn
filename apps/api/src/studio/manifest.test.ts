import { test } from "node:test";
import { strict as assert } from "node:assert";
import { studioDefaults } from "@codaryn/contracts";
import { createManifest } from "./manifest.js";
const repository = "11111111-1111-4111-8111-111111111111";
test("manifest hashing includes normalized settings, commit and analyzer versions", () => {
  const first = createManifest(repository, "a".repeat(40), {
    ...studioDefaults,
    analyzers: ["api", "react"],
    exclusions: ["vendor/**", "dist/**"],
  });
  const second = createManifest(repository, "a".repeat(40), {
    ...studioDefaults,
    analyzers: ["react", "api", "api"],
    exclusions: ["dist/**", "vendor/**"],
  });
  assert.deepEqual(first, second);
  assert.notEqual(
    first.hash,
    createManifest(repository, "b".repeat(40), first.manifest.configuration)
      .hash,
  );
  assert.notEqual(
    first.hash,
    createManifest(repository, "a".repeat(40), {
      ...first.manifest.configuration,
      depth: "deep",
    }).hash,
  );
  assert.ok(first.manifest.analyzers.every((item) => item.version === "1.0.0"));
});
