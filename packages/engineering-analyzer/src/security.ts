import ts from "typescript";
import type { QualitySnapshot } from "@codaryn/contracts";
import { evidence, finding, identity, bounds } from "./model.js";
const placeholder = (value: string) =>
  !value ||
  /^(?:\$\{|process\.env|env\.|secrets\.|undefined|null|true|false|example$|changeme$|placeholder$|redacted$|test[-_]?password$|your[-_])/i.test(
    value,
  );
function report(
  result: QualitySnapshot,
  path: string,
  source: string,
  start: number,
  end: number,
  ruleId: string,
  title: string,
  category: "secret" | "dangerous-code",
  severity: "high" | "medium" = "high",
) {
  finding(result, {
    ruleId,
    title,
    tool: "builtin",
    category,
    description:
      category === "secret"
        ? "A supported credential pattern matched. The value and source excerpt are redacted and are never persisted."
        : "A supported dangerous-code pattern requires review. This is not taint analysis or proof of exploitability.",
    severity,
    confidence: category === "secret" ? "high" : "medium",
    evidence: evidence(path, source, start, end),
    dependencyId: null,
  });
}
export function extractSecurity(
  path: string,
  source: string,
  result: QualitySnapshot,
) {
  const patterns = [
    {
      regex: /\b(?:ghp_|github_pat_|npg_)[A-Za-z0-9_]{12,}\b/g,
      id: "credential-token",
      title: "Hardcoded credential token",
    },
    {
      regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
      id: "credential-access-key",
      title: "Hardcoded cloud access key",
    },
    {
      regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
      id: "credential-private-key",
      title: "Private key material committed",
    },
    {
      regex: /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/gi,
      id: "credential-url",
      title: "Credential-bearing connection URL",
    },
  ];
  for (const pattern of patterns)
    for (const match of source.matchAll(pattern.regex))
      report(
        result,
        path,
        source,
        match.index,
        match.index + match[0].length,
        pattern.id,
        pattern.title,
        "secret",
      );
  for (const match of source.matchAll(
    /(?:password|passwd|secret|api[_-]?key|access[_-]?token)\s*["']?\s*[:=]\s*["']([^"'\r\n]{8,})["']/gi,
  ))
    if (!placeholder(match[1]))
      report(
        result,
        path,
        source,
        match.index,
        match.index + match[0].length,
        "credential-literal",
        "Literal credential-like value requires review",
        "secret",
      );
  if (/(^|\/)\.env(?:\.|$)/.test(path))
    for (const match of source.matchAll(
      /^\s*([A-Z][A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|KEY))\s*=\s*([^\r\n]*)/gm,
    ))
      if (!placeholder(match[2].replace(/^["']|["']$/g, "")))
        report(
          result,
          path,
          source,
          match.index,
          match.index + match[0].length,
          "credential-env",
          "Environment file contains a literal credential-like value",
          "secret",
        );
  if (!/\.[cm]?[jt]sx?$/.test(path)) return;
  const sf = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true),
    commands = new Set<string>(),
    namespaces = new Set<string>();
  for (const statement of sf.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !["child_process", "node:child_process"].includes(
        statement.moduleSpecifier.text,
      )
    )
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings))
      namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings))
      for (const binding of bindings.elements)
        if (
          ["exec", "execSync"].includes(
            binding.propertyName?.text ?? binding.name.text,
          )
        )
          commands.add(binding.name.text);
  }
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && ["eval", "Function"].includes(callee.text))
        report(
          result,
          path,
          source,
          node.getStart(sf),
          node.end,
          "dynamic-evaluation",
          "Dynamic code evaluation requires review",
          "dangerous-code",
          "medium",
        );
      const shell =
        (ts.isIdentifier(callee) && commands.has(callee.text)) ||
        (ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          namespaces.has(callee.expression.text) &&
          ["exec", "execSync"].includes(callee.name.text));
      const first = node.arguments?.[0];
      if (shell && first && !ts.isStringLiteralLike(first))
        report(
          result,
          path,
          source,
          node.getStart(sf),
          node.end,
          "dynamic-shell",
          "Dynamic input passed to a shell execution API",
          "dangerous-code",
        );
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  bounds(result);
}
export function extractEnvironment(
  path: string,
  source: string,
  result: QualitySnapshot,
) {
  const matches = [
    ...source.matchAll(
      /(?:process\.env\.|import\.meta\.env\.|\$\{)([A-Z_][A-Z0-9_]{0,127})/g,
    ),
  ];
  if (/(^|\/)\.env(?:\.|$)/.test(path))
    matches.push(...source.matchAll(/^\s*([A-Z_][A-Z0-9_]{0,127})\s*=/gm));
  for (const match of matches) {
    const name = match[1],
      example = path.includes("example") || path.includes("sample");
    result.environment.push({
      id: identity(path, name, example ? "example" : "reference"),
      name,
      source: example ? "example" : "reference",
      evidence: evidence(
        path,
        source,
        match.index,
        match.index + match[0].length,
      ),
    });
    bounds(result);
  }
}
