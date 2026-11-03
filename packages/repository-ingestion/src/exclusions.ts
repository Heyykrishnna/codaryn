import ignore from "ignore";
import type { IngestionOptions } from "./index.js";
interface IgnoreRule {
  base: string;
  rules: ReturnType<typeof ignore>;
}
function collectRules(entries: Map<string, Buffer>, enabled: boolean) {
  const rules: IgnoreRule[] = [];
  let bytes = 0;
  let lines = 0;
  if (!enabled) return rules;
  for (const [path, content] of entries) {
    if (path !== ".gitignore" && !path.endsWith("/.gitignore")) continue;
    if (content.length > 65536) throw new Error("Ignore file exceeds 64 KiB");
    bytes += content.length;
    lines += content.toString("utf8").split("\n").length;
    if (rules.length >= 100 || bytes > 262144 || lines > 2000)
      throw new Error("Repository ignore rules exceed supported limits");
    rules.push({
      base: path === ".gitignore" ? "" : path.slice(0, -10),
      rules: ignore().add(content.toString("utf8")),
    });
  }
  return rules.sort((a, b) => a.base.length - b.base.length);
}
function parentExcluded(path: string, rules: ReturnType<typeof ignore>) {
  const parts = path.split("/");
  for (let index = 1; index < parts.length; index++)
    if (rules.ignores(parts.slice(0, index).join("/") + "/")) return true;
  return false;
}
function excludedByRules(path: string, rules: IgnoreRule[]) {
  let excluded = false;
  for (const rule of rules) {
    if (!path.startsWith(rule.base)) continue;
    const relative = path.slice(rule.base.length);
    if (parentExcluded(relative, rule.rules)) return true;
    const result = rule.rules.test(relative);
    if (result.ignored) excluded = true;
    else if (result.unignored) excluded = false;
  }
  return excluded;
}
export function exclusionPredicate(
  entries: Map<string, Buffer>,
  options: IngestionOptions,
) {
  const defaults = ignore().add([
    ".git/",
    "node_modules/",
    "vendor/",
    "dist/",
    "build/",
    "coverage/",
    ...(options.excludes ?? []),
  ]);
  const rules = collectRules(entries, options.respectGitignore !== false);
  return (path: string) =>
    defaults.ignores(path) || excludedByRules(path, rules);
}
