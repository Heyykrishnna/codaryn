import ts from "typescript";
import type {
  FrontendComponent,
  FrontendRoute,
  RouteFramework,
} from "@codaryn/contracts";
import { generateSymbolId } from "@codaryn/symbols";

function extractDynamicParams(routePath: string): string[] {
  const params: string[] = [];
  const nextParamRegex = /\[(?:\.\.\.)?([a-zA-Z0-9_]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = nextParamRegex.exec(routePath)) !== null) {
    if (match[1]) params.push(match[1]);
  }

  const reactRouterParamRegex = /:([a-zA-Z0-9_]+)/g;
  while ((match = reactRouterParamRegex.exec(routePath)) !== null) {
    if (match[1]) params.push(match[1]);
  }

  return params.sort((a, b) => a.localeCompare(b));
}

function normalizeAppRouterPath(
  filePath: string,
): { routePath: string; isLayout: boolean } | null {
  const norm = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!norm.includes("app/")) return null;

  const appIndex = norm.indexOf("app/");
  const relative = norm.slice(appIndex + 4);

  const isPage =
    /\/page\.(tsx|jsx|js|ts)$/.test(relative) ||
    /^page\.(tsx|jsx|js|ts)$/.test(relative);
  const isLayout =
    /\/layout\.(tsx|jsx|js|ts)$/.test(relative) ||
    /^layout\.(tsx|jsx|js|ts)$/.test(relative);

  if (!isPage && !isLayout) return null;

  let pathPart = relative
    .replace(/\/(page|layout)\.(tsx|jsx|js|ts)$/, "")
    .replace(/^(page|layout)\.(tsx|jsx|js|ts)$/, "");

  const segments = pathPart
    .split("/")
    .filter((seg) => seg.length > 0 && !/^\(.*\)$/.test(seg));
  const routePath = "/" + segments.join("/");

  return { routePath: routePath === "" ? "/" : routePath, isLayout };
}

function normalizePagesRouterPath(filePath: string): string | null {
  const norm = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!norm.includes("pages/")) return null;

  const pagesIndex = norm.indexOf("pages/");
  const relative = norm.slice(pagesIndex + 6);

  if (
    relative.startsWith("api/") ||
    relative.startsWith("_app.") ||
    relative.startsWith("_document.")
  ) {
    return null;
  }

  let route = "/" + relative.replace(/\.(tsx|jsx|js|ts)$/, "");
  if (route.endsWith("/index")) {
    route = route.slice(0, -6);
  }
  return route === "" ? "/" : route;
}

export function extractRoutes(
  sourceFile: ts.SourceFile,
  filePath: string,
  components: readonly FrontendComponent[],
): FrontendRoute[] {
  const routes: FrontendRoute[] = [];

  const appRouterInfo = normalizeAppRouterPath(filePath);
  if (appRouterInfo) {
    const start = sourceFile.getLineAndCharacterOfPosition(0);
    const end = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd());
    const startLine = start.line + 1;
    const startColumn = start.character + 1;
    const endLine = Math.max(startLine, end.line + 1);

    const defaultComp =
      components.find(
        (c) => c.exportType === "default" && c.filePath === filePath,
      ) ?? components[0];

    const id = generateSymbolId(
      filePath,
      "route",
      `nextjs_app_${appRouterInfo.routePath}`,
      startLine,
      startColumn,
    );

    routes.push({
      id,
      framework: "nextjs_app",
      routePath: appRouterInfo.routePath,
      filePath,
      componentName: defaultComp?.name,
      componentId: defaultComp?.id ?? null,
      dynamicParams: extractDynamicParams(appRouterInfo.routePath),
      isLayout: appRouterInfo.isLayout,
      sourceEvidence: {
        path: filePath,
        startLine,
        endLine,
      },
    });

    return routes;
  }

  const pagesRoute = normalizePagesRouterPath(filePath);
  if (pagesRoute) {
    const start = sourceFile.getLineAndCharacterOfPosition(0);
    const end = sourceFile.getLineAndCharacterOfPosition(sourceFile.getEnd());
    const startLine = start.line + 1;
    const startColumn = start.character + 1;
    const endLine = Math.max(startLine, end.line + 1);

    const defaultComp =
      components.find(
        (c) => c.exportType === "default" && c.filePath === filePath,
      ) ?? components[0];

    const id = generateSymbolId(
      filePath,
      "route",
      `nextjs_pages_${pagesRoute}`,
      startLine,
      startColumn,
    );

    routes.push({
      id,
      framework: "nextjs_pages",
      routePath: pagesRoute,
      filePath,
      componentName: defaultComp?.name,
      componentId: defaultComp?.id ?? null,
      dynamicParams: extractDynamicParams(pagesRoute),
      isLayout: false,
      sourceEvidence: {
        path: filePath,
        startLine,
        endLine,
      },
    });

    return routes;
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagNameNode = ts.isJsxElement(node)
        ? node.openingElement.tagName
        : node.tagName;
      const tagText = tagNameNode.getText(sourceFile);

      if (tagText === "Route") {
        const attributes = ts.isJsxElement(node)
          ? node.openingElement.attributes
          : node.attributes;
        let routePath: string | undefined;
        let compName: string | undefined;

        for (const prop of attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name) {
            const propName = prop.name.getText(sourceFile);
            if (propName === "path" && prop.initializer) {
              if (ts.isStringLiteral(prop.initializer)) {
                routePath = prop.initializer.text;
              } else if (
                ts.isJsxExpression(prop.initializer) &&
                prop.initializer.expression &&
                ts.isStringLiteral(prop.initializer.expression)
              ) {
                routePath = prop.initializer.expression.text;
              }
            } else if (
              (propName === "element" || propName === "Component") &&
              prop.initializer
            ) {
              if (
                ts.isJsxExpression(prop.initializer) &&
                prop.initializer.expression
              ) {
                const expr = prop.initializer.expression;
                if (ts.isJsxElement(expr)) {
                  compName = expr.openingElement.tagName.getText(sourceFile);
                } else if (ts.isJsxSelfClosingElement(expr)) {
                  compName = expr.tagName.getText(sourceFile);
                } else if (ts.isIdentifier(expr)) {
                  compName = expr.text;
                }
              }
            }
          }
        }

        if (routePath) {
          const start = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile),
          );
          const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
          const startLine = start.line + 1;
          const startColumn = start.character + 1;
          const endLine = Math.max(startLine, end.line + 1);

          const matchedComp = compName
            ? components.find((c) => c.name === compName)
            : undefined;

          const id = generateSymbolId(
            filePath,
            "route",
            `react_router_${routePath}`,
            startLine,
            startColumn,
          );

          routes.push({
            id,
            framework: "react_router",
            routePath,
            filePath,
            componentName: compName,
            componentId: matchedComp?.id ?? null,
            dynamicParams: extractDynamicParams(routePath),
            isLayout: false,
            sourceEvidence: {
              path: filePath,
              startLine,
              endLine,
            },
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return routes.sort((a, b) => a.routePath.localeCompare(b.routePath));
}
