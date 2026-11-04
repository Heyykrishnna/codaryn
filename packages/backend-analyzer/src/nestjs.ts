import ts from "typescript";
import type {
  BackendController,
  BackendRoute,
  BackendHttpMethod,
} from "@codaryn/contracts";
import { normalizeRoutePath } from "./express-fastify.js";

const NEST_HTTP_DECORATORS: Record<string, BackendHttpMethod> = {
  Get: "GET",
  Post: "POST",
  Put: "PUT",
  Patch: "PATCH",
  Delete: "DELETE",
  Options: "OPTIONS",
  Head: "HEAD",
  All: "ALL",
};

function getDecorators(node: ts.Node): ts.Decorator[] {
  if (ts.canHaveDecorators(node)) {
    const decs = ts.getDecorators(node);
    if (decs) return Array.from(decs);
  }
  return [];
}

function getDecoratorName(decorator: ts.Decorator): string | null {
  const expr = decorator.expression;
  if (ts.isCallExpression(expr)) {
    if (ts.isIdentifier(expr.expression)) return expr.expression.text;
    if (ts.isPropertyAccessExpression(expr.expression))
      return expr.expression.name.text;
  } else if (ts.isIdentifier(expr)) {
    return expr.text;
  }
  return null;
}

function getDecoratorArgString(decorator: ts.Decorator): string {
  const expr = decorator.expression;
  if (ts.isCallExpression(expr) && expr.arguments.length > 0) {
    const firstArg = expr.arguments[0];
    if (firstArg) {
      if (
        ts.isStringLiteral(firstArg) ||
        ts.isNoSubstitutionTemplateLiteral(firstArg)
      ) {
        return firstArg.text;
      }
      if (ts.isObjectLiteralExpression(firstArg)) {
        for (const prop of firstArg.properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            prop.name.getText() === "path" &&
            (ts.isStringLiteral(prop.initializer) ||
              ts.isNoSubstitutionTemplateLiteral(prop.initializer))
          ) {
            return prop.initializer.text;
          }
        }
      }
    }
  }
  return "";
}

function extractMiddlewareFromDecorators(decorators: ts.Decorator[]): string[] {
  const result: string[] = [];
  for (const dec of decorators) {
    const name = getDecoratorName(dec);
    if (
      name === "UseGuards" ||
      name === "UsePipes" ||
      name === "UseInterceptors"
    ) {
      const expr = dec.expression;
      if (ts.isCallExpression(expr)) {
        for (const arg of expr.arguments) {
          result.push(arg.getText());
        }
      }
    }
  }
  return result;
}

export function extractNestJsControllersAndRoutes(
  sourceFile: ts.SourceFile,
  filePath: string,
): { controllers: BackendController[]; routes: BackendRoute[] } {
  const controllers: BackendController[] = [];
  const routes: BackendRoute[] = [];
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");

  function visit(node: ts.Node): void {
    if (ts.isClassDeclaration(node) && node.name) {
      const classDecorators = getDecorators(node);
      const controllerDecorator = classDecorators.find(
        (d) => getDecoratorName(d) === "Controller",
      );

      if (controllerDecorator) {
        const className = node.name.text;
        const basePath = getDecoratorArgString(controllerDecorator);
        const classMiddleware =
          extractMiddlewareFromDecorators(classDecorators);

        const { line: startLine, character: startCol } =
          sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(
          node.getEnd(),
        );

        const controllerId = `ctrl:nestjs:${normalizedPath}:${className}:${startLine + 1}:${startCol + 1}`;
        let routesCount = 0;

        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name) {
            const methodDecorators = getDecorators(member);
            for (const dec of methodDecorators) {
              const decName = getDecoratorName(dec);
              const httpMethod = decName
                ? NEST_HTTP_DECORATORS[decName]
                : undefined;

              if (httpMethod) {
                const subPath = getDecoratorArgString(dec);
                const finalPath = normalizeRoutePath(basePath, subPath);
                const methodName = member.name.getText();
                const methodMiddleware =
                  extractMiddlewareFromDecorators(methodDecorators);
                const combinedMiddleware = [
                  ...classMiddleware,
                  ...methodMiddleware,
                ];

                const { line: mStartLine, character: mStartCol } =
                  sourceFile.getLineAndCharacterOfPosition(member.getStart());
                const { line: mEndLine } =
                  sourceFile.getLineAndCharacterOfPosition(member.getEnd());

                const routeId = `route:nestjs:${normalizedPath}:${httpMethod}:${finalPath}:${mStartLine + 1}:${mStartCol + 1}`;

                routes.push({
                  id: routeId,
                  framework: "nestjs",
                  method: httpMethod,
                  path: finalPath,
                  filePath: normalizedPath,
                  handlerName: methodName,
                  handlerSymbolId: null,
                  controllerName: className,
                  middleware: combinedMiddleware,
                  isDynamic: finalPath.includes(":") || finalPath.includes("*"),
                  sourceEvidence: {
                    path: normalizedPath,
                    startLine: mStartLine + 1,
                    endLine: mEndLine + 1,
                  },
                });
                routesCount++;
              }
            }
          }
        }

        controllers.push({
          id: controllerId,
          name: className,
          filePath: normalizedPath,
          framework: "nestjs",
          routesCount,
          basePath: basePath || null,
          sourceEvidence: {
            path: normalizedPath,
            startLine: startLine + 1,
            endLine: endLine + 1,
          },
        });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return { controllers, routes };
}
