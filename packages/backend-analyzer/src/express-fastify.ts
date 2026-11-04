import ts from "typescript";
import type { BackendRoute, BackendHttpMethod } from "@codaryn/contracts";

const HTTP_METHODS: Record<string, BackendHttpMethod> = {
  get: "GET",
  post: "POST",
  put: "PUT",
  patch: "PATCH",
  delete: "DELETE",
  options: "OPTIONS",
  head: "HEAD",
  all: "ALL",
};

export function normalizeRoutePath(prefix: string, routePath: string): string {
  const cleanPrefix = prefix.replace(/\/+$/, "");
  const cleanPath = routePath.replace(/^\/+/, "");
  if (!cleanPrefix && !cleanPath) return "/";
  if (!cleanPrefix) return `/${cleanPath}`;
  if (!cleanPath)
    return cleanPrefix.startsWith("/") ? cleanPrefix : `/${cleanPrefix}`;
  const combined = `${cleanPrefix}/${cleanPath}`;
  return combined.startsWith("/") ? combined : `/${combined}`;
}

function extractPathAndDynamic(node: ts.Expression): {
  path: string;
  isDynamic: boolean;
} {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return { path: node.text, isDynamic: false };
  }
  if (ts.isTemplateExpression(node)) {
    let raw = node.head.text;
    for (const span of node.templateSpans) {
      const paramName = span.expression
        .getText()
        .replace(/[^a-zA-Z0-9_]/g, "_");
      raw += `:${paramName}${span.literal.text}`;
    }
    return { path: raw, isDynamic: true };
  }
  return { path: node.getText(), isDynamic: true };
}

function extractMiddlewareNames(
  args: ts.NodeArray<ts.Expression>,
  startIndex: number,
  endIndex: number,
): string[] {
  const result: string[] = [];
  for (let i = startIndex; i < endIndex; i++) {
    const arg = args[i];
    if (!arg) continue;
    if (ts.isIdentifier(arg)) {
      result.push(arg.text);
    } else if (ts.isCallExpression(arg)) {
      result.push(arg.expression.getText());
    } else if (ts.isArrayLiteralExpression(arg)) {
      for (const el of arg.elements) {
        result.push(el.getText());
      }
    } else if (ts.isPropertyAccessExpression(arg)) {
      result.push(arg.getText());
    }
  }
  return result;
}

export function extractExpressMountedRouters(
  sourceFile: ts.SourceFile,
): Map<string, string> {
  const mountMap = new Map<string, string>();

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (
        ts.isPropertyAccessExpression(expr) &&
        expr.name.text === "use" &&
        node.arguments.length >= 2
      ) {
        const firstArg = node.arguments[0];
        const secondArg = node.arguments[1];
        if (
          firstArg &&
          (ts.isStringLiteral(firstArg) ||
            ts.isNoSubstitutionTemplateLiteral(firstArg)) &&
          secondArg &&
          ts.isIdentifier(secondArg)
        ) {
          mountMap.set(secondArg.text, firstArg.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return mountMap;
}

export function extractExpressRoutes(
  sourceFile: ts.SourceFile,
  filePath: string,
): BackendRoute[] {
  const routes: BackendRoute[] = [];
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const mountMap = extractExpressMountedRouters(sourceFile);

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        const methodName = expr.name.text.toLowerCase();
        const callerName = expr.expression.getText();
        const httpMethod = HTTP_METHODS[methodName];

        if (httpMethod && node.arguments.length >= 2) {
          const firstArg = node.arguments[0];
          if (firstArg) {
            const { path: rawPath, isDynamic } =
              extractPathAndDynamic(firstArg);
            const prefix = mountMap.get(callerName) ?? "";
            const finalPath = normalizeRoutePath(prefix, rawPath);

            const lastArgIndex = node.arguments.length - 1;
            const lastArg = node.arguments[lastArgIndex];
            let handlerName = "<anonymous>";
            let controllerName: string | null = null;

            if (lastArg) {
              if (ts.isIdentifier(lastArg)) {
                handlerName = lastArg.text;
              } else if (ts.isPropertyAccessExpression(lastArg)) {
                handlerName = lastArg.name.text;
                controllerName = lastArg.expression.getText();
              } else if (ts.isFunctionDeclaration(lastArg) && lastArg.name) {
                handlerName = lastArg.name.text;
              }
            }

            const middleware = extractMiddlewareNames(
              node.arguments,
              1,
              lastArgIndex,
            );
            const { line: startLine, character: startCol } =
              sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(
              node.getEnd(),
            );

            const id = `route:express:${normalizedPath}:${httpMethod}:${finalPath}:${startLine + 1}:${startCol + 1}`;

            routes.push({
              id,
              framework: "express",
              method: httpMethod,
              path: finalPath,
              filePath: normalizedPath,
              handlerName,
              handlerSymbolId: null,
              controllerName,
              middleware,
              isDynamic,
              sourceEvidence: {
                path: normalizedPath,
                startLine: startLine + 1,
                endLine: endLine + 1,
              },
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}

export function extractFastifyRoutes(
  sourceFile: ts.SourceFile,
  filePath: string,
): BackendRoute[] {
  const routes: BackendRoute[] = [];
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  let pluginPrefix = "";

  function inspectPrefix(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "register"
    ) {
      const optsArg = node.arguments[1];
      if (optsArg && ts.isObjectLiteralExpression(optsArg)) {
        for (const prop of optsArg.properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            prop.name.getText() === "prefix" &&
            (ts.isStringLiteral(prop.initializer) ||
              ts.isNoSubstitutionTemplateLiteral(prop.initializer))
          ) {
            pluginPrefix = prop.initializer.text;
          }
        }
      }
    }
    ts.forEachChild(node, inspectPrefix);
  }

  inspectPrefix(sourceFile);

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      if (ts.isPropertyAccessExpression(expr)) {
        const methodName = expr.name.text.toLowerCase();
        const httpMethod = HTTP_METHODS[methodName];

        if (httpMethod && node.arguments.length >= 2) {
          const firstArg = node.arguments[0];
          if (firstArg) {
            const { path: rawPath, isDynamic } =
              extractPathAndDynamic(firstArg);
            const finalPath = normalizeRoutePath(pluginPrefix, rawPath);
            const middleware: string[] = [];
            let handlerName = "<anonymous>";

            const secondArg = node.arguments[1];
            if (node.arguments.length === 2 && secondArg) {
              if (ts.isIdentifier(secondArg)) {
                handlerName = secondArg.text;
              } else if (ts.isPropertyAccessExpression(secondArg)) {
                handlerName = secondArg.name.text;
              }
            } else if (node.arguments.length >= 3 && secondArg) {
              if (ts.isObjectLiteralExpression(secondArg)) {
                for (const prop of secondArg.properties) {
                  if (ts.isPropertyAssignment(prop)) {
                    const propName = prop.name.getText();
                    if (
                      propName === "preHandler" ||
                      propName === "preValidation" ||
                      propName === "onRequest"
                    ) {
                      if (ts.isArrayLiteralExpression(prop.initializer)) {
                        for (const el of prop.initializer.elements) {
                          middleware.push(el.getText());
                        }
                      } else {
                        middleware.push(prop.initializer.getText());
                      }
                    }
                  }
                }
              }

              const thirdArg = node.arguments[2];
              if (thirdArg) {
                if (ts.isIdentifier(thirdArg)) {
                  handlerName = thirdArg.text;
                } else if (ts.isPropertyAccessExpression(thirdArg)) {
                  handlerName = thirdArg.name.text;
                }
              }
            }

            const { line: startLine, character: startCol } =
              sourceFile.getLineAndCharacterOfPosition(node.getStart());
            const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(
              node.getEnd(),
            );

            const id = `route:fastify:${normalizedPath}:${httpMethod}:${finalPath}:${startLine + 1}:${startCol + 1}`;

            routes.push({
              id,
              framework: "fastify",
              method: httpMethod,
              path: finalPath,
              filePath: normalizedPath,
              handlerName,
              handlerSymbolId: null,
              controllerName: null,
              middleware,
              isDynamic,
              sourceEvidence: {
                path: normalizedPath,
                startLine: startLine + 1,
                endLine: endLine + 1,
              },
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return routes;
}
