import type { QualitySnapshot } from "@codaryn/contracts";
import {
  object,
  text,
  configuration,
  identity,
  evidence,
  diagnostic,
  bounds,
} from "./model.js";
const nameValid = (name: string) =>
  /^(?:@[a-z0-9_.-]+\/)?[a-z0-9_.-]+$/i.test(name) && name.length <= 256;
const exact = (version: string) =>
  /^\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?(?:\+[A-Za-z0-9.-]+)?$/.test(version);
function dependency(
  result: QualitySnapshot,
  path: string,
  source: string,
  name: string,
  version: string,
  provenance: "declared" | "resolved",
  dev: boolean,
  key: string,
) {
  if (!nameValid(name) || !version) return;
  if (provenance === "resolved" && !exact(version)) {
    diagnostic(
      result,
      path,
      source,
      "DEPENDENCY_VERSION_PARTIAL",
      "A non-exact lockfile entry cannot be used as a resolved version.",
    );
    return;
  }
  const safeVersion =
    /^[0-9A-Za-z.*^~<>=|+ -]{1,160}$/.test(version) ||
    /^workspace:[*^~]$/.test(version)
      ? version
      : "[non-semver declaration]";
  result.dependencies.push({
    id: identity(path, key, name, safeVersion),
    name,
    version: safeVersion,
    ecosystem: "npm",
    provenance,
    dev,
    evidence: evidence(path, source),
  });
  bounds(result);
}
export function extractDependencies(
  path: string,
  source: string,
  result: QualitySnapshot,
) {
  if (path.endsWith("package.json") && !path.endsWith("package-lock.json")) {
    const data = object(JSON.parse(source));
    for (const field of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ])
      for (const [name, value] of Object.entries(object(data[field])))
        dependency(
          result,
          path,
          source,
          name,
          text(value),
          "declared",
          field === "devDependencies",
          field,
        );
  } else if (path.endsWith("package-lock.json")) {
    const data = object(JSON.parse(source)),
      packages = object(data.packages);
    if (!Object.keys(packages).length) {
      diagnostic(
        result,
        path,
        source,
        "LOCKFILE_UNSUPPORTED",
        "Only npm package-lock package maps (v2/v3) are supported; no resolved versions are fabricated.",
      );
      return;
    }
    for (const [key, value] of Object.entries(packages)) {
      if (!key) continue;
      const entry = object(value),
        at = key.lastIndexOf("node_modules/");
      const name = text(entry.name) || (at >= 0 ? key.slice(at + 13) : "");
      dependency(
        result,
        path,
        source,
        name,
        text(entry.version),
        "resolved",
        entry.dev === true,
        key,
      );
    }
  } else if (path.endsWith("pnpm-lock.yaml")) {
    const data = configuration(source),
      packages = object(data.packages);
    for (const key of Object.keys(packages)) {
      const base = key.split("(")[0],
        at = base.lastIndexOf("@");
      if (at <= 0) {
        diagnostic(
          result,
          path,
          source,
          "LOCKFILE_UNSUPPORTED",
          "A pnpm package key is outside the supported name@version format.",
        );
        continue;
      }
      dependency(
        result,
        path,
        source,
        base.slice(0, at),
        base.slice(at + 1),
        "resolved",
        false,
        key,
      );
    }
  }
}
