import ts from "typescript";
import { extractCallIndex } from "@codaryn/execution-analyzer";
import type { QualitySnapshot, QualityTest } from "@codaryn/contracts";
import {
  identity,
  evidence,
  safeLabel,
  object,
  resolveReportPath,
  diagnostic,
  bounds,
} from "./model.js";
function testRoot(expression: ts.Expression): string {
  if (ts.isIdentifier(expression)) return expression.text;
  if (ts.isPropertyAccessExpression(expression))
    return testRoot(expression.expression);
  if (ts.isCallExpression(expression)) return testRoot(expression.expression);
  return "";
}
export function extractTests(
  files: Record<string, string>,
  result: QualitySnapshot,
) {
  const sources = Object.fromEntries(
      Object.entries(files).filter(([path]) => /\.[cm]?[jt]sx?$/.test(path)),
    ),
    index = extractCallIndex(sources),
    functions = new Map(index.functions.map((fn) => [fn.id, fn]));
  for (const [path, source] of Object.entries(sources)) {
    if (!/(?:^|\/)(?:__tests__\/|.*\.(?:test|spec)\.)/.test(path)) continue;
    const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true),
      bindings = new Map<string, "vitest" | "jest">();
    for (const statement of sf.statements)
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        const framework =
          statement.moduleSpecifier.text === "vitest"
            ? "vitest"
            : statement.moduleSpecifier.text === "@jest/globals"
              ? "jest"
              : null;
        const imports = statement.importClause?.namedBindings;
        if (framework && imports && ts.isNamedImports(imports))
          for (const item of imports.elements)
            if (
              ["test", "it"].includes(item.propertyName?.text ?? item.name.text)
            )
              bindings.set(item.name.text, framework);
      }
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node)) {
        const root = testRoot(node.expression),
          framework = bindings.get(root);
        if (framework || ["test", "it"].includes(root)) {
          const name = node.arguments[0],
            callback = node.arguments.find(
              (argument) =>
                ts.isArrowFunction(argument) ||
                ts.isFunctionExpression(argument),
            );
          if (name && ts.isStringLiteralLike(name)) {
            const expression = node.expression.getText(sf);
            const modes = ["skip", "only", "todo"] as const;
            const mode =
              modes.find((mode) => expression.split(".").includes(mode)) ??
              "normal";
            const test: QualityTest = {
              id: identity(path, node.getStart(sf), "test"),
              name: safeLabel(name.text),
              framework:
                framework ??
                (result.dependencies.some(
                  (dep) => dep.provenance === "declared" && dep.name === "jest",
                ) &&
                !result.dependencies.some(
                  (dep) =>
                    dep.provenance === "declared" && dep.name === "vitest",
                )
                  ? "jest"
                  : "unknown"),
              mode,
              parameterized: expression.includes(".each"),
              evidence: evidence(path, source, node.getStart(sf), node.end),
            };
            result.tests.push(test);
            if (callback) {
              const owner = `${path}:${callback.getStart(sf)}:function`;
              for (const call of index.calls.filter(
                (call) => call.sourceId === owner && call.targetId,
              )) {
                const target = functions.get(call.targetId!);
                if (target)
                  result.testLinks.push({
                    id: identity(test.id, call.id),
                    testId: test.id,
                    symbolId: target.id,
                    symbolName: safeLabel(target.name),
                    kind: call.kind === "callback" ? "references" : "calls",
                    evidence: call.evidence,
                    targetEvidence: target.evidence,
                  });
              }
            }
            bounds(result);
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sf);
  }
  for (const item of index.diagnostics)
    result.diagnostics.push({ ...item, code: `TEST_${item.code}` });
  bounds(result);
}
export function extractLcov(
  path: string,
  source: string,
  files: Record<string, string>,
  result: QualitySnapshot,
) {
  let target: string | undefined,
    lineLimit = 0;
  const records = new Map<string, Map<number, number>>();
  for (const line of source.split("\n")) {
    if (line.startsWith("SF:")) {
      target = resolveReportPath(line.slice(3).trim(), files);
      lineLimit = target ? files[target].split("\n").length : 0;
      if (!target)
        diagnostic(
          result,
          path,
          source,
          "COVERAGE_PATH",
          "Coverage source is absent or ambiguous in the pinned archive.",
        );
    } else if (line.startsWith("DA:") && target) {
      const [number, hits] = line.slice(3).split(",").map(Number);
      if (
        Number.isInteger(number) &&
        number > 0 &&
        number <= lineLimit &&
        Number.isInteger(hits) &&
        hits >= 0
      ) {
        const lines = records.get(target) ?? new Map<number, number>();
        lines.set(number, Math.max(lines.get(number) ?? 0, hits));
        records.set(target, lines);
      } else
        diagnostic(
          result,
          path,
          source,
          "COVERAGE_PARTIAL",
          "A malformed or out-of-range coverage line was ignored.",
        );
    } else if (line.trim() === "end_of_record") target = undefined;
  }
  for (const [target, lines] of records) {
    result.coverage.push({
      id: identity(path, target),
      path: target,
      format: "lcov",
      metric: "lines",
      covered: [...lines.values()].filter((hits) => hits > 0).length,
      total: lines.size,
      reportEvidence: evidence(path, source),
    });
    bounds(result);
  }
}
export function extractIstanbul(
  path: string,
  source: string,
  files: Record<string, string>,
  result: QualitySnapshot,
) {
  const data = object(JSON.parse(source));
  for (const [key, raw] of Object.entries(data)) {
    const record = object(raw),
      target = resolveReportPath(
        typeof record.path === "string" ? record.path : key,
        files,
      ),
      counts = Object.values(object(record.s));
    if (!target) {
      diagnostic(
        result,
        path,
        source,
        "COVERAGE_PATH",
        "Coverage source is absent or ambiguous in the pinned archive.",
      );
      continue;
    }
    if (!Object.hasOwn(record, "s")) {
      diagnostic(
        result,
        path,
        source,
        "COVERAGE_PARTIAL",
        "Missing statement counts do not establish coverage.",
      );
      continue;
    }
    if (
      counts.some(
        (value) =>
          typeof value !== "number" || !Number.isInteger(value) || value < 0,
      )
    ) {
      diagnostic(
        result,
        path,
        source,
        "COVERAGE_PARTIAL",
        "Malformed statement coverage was not treated as a clean result.",
      );
      continue;
    }
    result.coverage.push({
      id: identity(path, target),
      path: target,
      format: "istanbul",
      metric: "statements",
      covered: counts.filter((value) => typeof value === "number" && value > 0)
        .length,
      total: counts.length,
      reportEvidence: evidence(path, source),
    });
    bounds(result);
  }
}
