import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveModule } from "./resolver.js";

describe("resolveModule", () => {
  const repoFiles = [
    "packages/core/src/index.ts",
    "packages/core/src/calculator.ts",
    "packages/core/src/utils/math.ts",
    "packages/ui/src/Button.tsx",
    "packages/ui/src/index.ts",
    "src/components/Header.tsx",
    "src/utils/format.ts",
  ];

  it("resolves relative imports with various file extensions and directory indexes", () => {
    const res1 = resolveModule(
      "./calculator",
      "packages/core/src/index.ts",
      repoFiles,
    );
    assert.equal(res1.resolvedPath, "packages/core/src/calculator.ts");
    assert.equal(res1.isExternal, false);

    const res2 = resolveModule(
      "./Button",
      "packages/ui/src/index.ts",
      repoFiles,
    );
    assert.equal(res2.resolvedPath, "packages/ui/src/Button.tsx");

    const res3 = resolveModule(
      "./utils/math",
      "packages/core/src/index.ts",
      repoFiles,
    );
    assert.equal(res3.resolvedPath, "packages/core/src/utils/math.ts");

    const res4 = resolveModule(
      "../../ui/src",
      "packages/core/src/index.ts",
      repoFiles,
    );
    assert.equal(res4.resolvedPath, "packages/ui/src/index.ts");
  });

  it("resolves .js specifiers to matching .ts or .tsx source files", () => {
    const res = resolveModule(
      "./calculator.js",
      "packages/core/src/index.ts",
      repoFiles,
    );
    assert.equal(res.resolvedPath, "packages/core/src/calculator.ts");
    assert.equal(res.isExternal, false);
  });

  it("resolves tsconfig path aliases accurately", () => {
    const options = {
      baseUrl: ".",
      paths: {
        "@/*": ["src/*"],
        "@components/*": ["src/components/*"],
      },
    };

    const res1 = resolveModule(
      "@/utils/format",
      "src/index.ts",
      repoFiles,
      options,
    );
    assert.equal(res1.resolvedPath, "src/utils/format.ts");
    assert.equal(res1.isExternal, false);

    const res2 = resolveModule(
      "@components/Header",
      "src/index.ts",
      repoFiles,
      options,
    );
    assert.equal(res2.resolvedPath, "src/components/Header.tsx");
  });

  it("resolves monorepo package roots", () => {
    const options = {
      packageRoots: {
        "@codaryn/core": "packages/core/src/index.ts",
        "@codaryn/ui": "packages/ui/src/index.ts",
      },
    };

    const res = resolveModule(
      "@codaryn/core",
      "packages/ui/src/Button.tsx",
      repoFiles,
      options,
    );
    assert.equal(res.resolvedPath, "packages/core/src/index.ts");
    assert.equal(res.isExternal, false);
  });

  it("identifies external packages and extracts package names", () => {
    const res1 = resolveModule("react", "src/index.ts", repoFiles);
    assert.equal(res1.isExternal, true);
    assert.equal(res1.packageName, "react");
    assert.equal(res1.resolvedPath, null);

    const res2 = resolveModule("@types/node/fs", "src/index.ts", repoFiles);
    assert.equal(res2.isExternal, true);
    assert.equal(res2.packageName, "@types/node");

    const res3 = resolveModule("fastify/lib/server", "src/index.ts", repoFiles);
    assert.equal(res3.isExternal, true);
    assert.equal(res3.packageName, "fastify");
  });

  it("correctly identifies unresolved local imports", () => {
    const res = resolveModule(
      "./non-existent",
      "packages/core/src/index.ts",
      repoFiles,
    );
    assert.equal(res.isExternal, false);
    assert.equal(res.resolvedPath, null);
  });
});
