import ts from "typescript";
import type {
  BackendService,
  BackendRepository,
  BackendMiddleware,
  RepositoryOrmKind,
  MiddlewareKind,
} from "@codaryn/contracts";

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

function detectOrmType(sourceFile: ts.SourceFile): RepositoryOrmKind {
  const fullText = sourceFile.getFullText();
  if (fullText.includes("prisma") || fullText.includes("@prisma/client"))
    return "prisma";
  if (fullText.includes("drizzle-orm")) return "drizzle";
  if (fullText.includes("typeorm")) return "typeorm";
  if (fullText.includes("kysely")) return "kysely";
  if (
    fullText.includes(".query(") ||
    fullText.includes("SELECT ") ||
    fullText.includes("INSERT INTO ")
  )
    return "sql";
  return "custom";
}

function classifyMiddlewareKind(name: string): MiddlewareKind {
  const lower = name.toLowerCase();
  if (
    lower.includes("auth") ||
    lower.includes("jwt") ||
    lower.includes("token") ||
    lower.includes("session") ||
    lower.includes("guard")
  ) {
    return "auth";
  }
  if (
    lower.includes("valida") ||
    lower.includes("schema") ||
    lower.includes("zod") ||
    lower.includes("pipe") ||
    lower.includes("joi")
  ) {
    return "validation";
  }
  if (
    lower.includes("log") ||
    lower.includes("trace") ||
    lower.includes("morgan") ||
    lower.includes("pino")
  ) {
    return "logging";
  }
  if (lower.includes("cors")) {
    return "cors";
  }
  if (
    lower.includes("rate") ||
    lower.includes("limit") ||
    lower.includes("throttle")
  ) {
    return "rate_limit";
  }
  return "custom";
}

export function extractServicesAndRepositories(
  sourceFile: ts.SourceFile,
  filePath: string,
): {
  services: BackendService[];
  repositories: BackendRepository[];
  middleware: BackendMiddleware[];
} {
  const services: BackendService[] = [];
  const repositories: BackendRepository[] = [];
  const middleware: BackendMiddleware[] = [];
  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  const ormType = detectOrmType(sourceFile);

  function visit(node: ts.Node): void {
    if (ts.isClassDeclaration(node) && node.name) {
      const className = node.name.text;
      const classDecorators = getDecorators(node);
      const isInjectable = classDecorators.some(
        (d) => getDecoratorName(d) === "Injectable",
      );
      const isService = className.endsWith("Service") || isInjectable;
      const isRepository = className.endsWith("Repository");

      const methods: string[] = [];
      const injectedDependencies: string[] = [];

      for (const member of node.members) {
        if (ts.isMethodDeclaration(member) && member.name) {
          methods.push(member.name.getText());
        } else if (ts.isConstructorDeclaration(member)) {
          for (const param of member.parameters) {
            if (param.type) {
              injectedDependencies.push(param.type.getText());
            } else if (ts.isIdentifier(param.name)) {
              injectedDependencies.push(param.name.text);
            }
          }
        }
      }

      const { line: startLine, character: startCol } =
        sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(
        node.getEnd(),
      );

      if (isService && !isRepository) {
        const id = `svc:${normalizedPath}:${className}:${startLine + 1}:${startCol + 1}`;
        services.push({
          id,
          name: className,
          filePath: normalizedPath,
          methods,
          injectedDependencies,
          sourceEvidence: {
            path: normalizedPath,
            startLine: startLine + 1,
            endLine: endLine + 1,
          },
        });
      } else if (isRepository) {
        const id = `repo:${normalizedPath}:${className}:${startLine + 1}:${startCol + 1}`;
        repositories.push({
          id,
          name: className,
          filePath: normalizedPath,
          ormType,
          methods,
          sourceEvidence: {
            path: normalizedPath,
            startLine: startLine + 1,
            endLine: endLine + 1,
          },
        });
      }
    } else if (
      (ts.isFunctionDeclaration(node) && node.name) ||
      (ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer)))
    ) {
      const fnName = ts.isFunctionDeclaration(node)
        ? (node.name?.text ?? "")
        : (node.name as ts.Identifier).text;

      const params = ts.isFunctionDeclaration(node)
        ? node.parameters
        : (node.initializer as ts.FunctionLikeDeclaration).parameters;

      const isExpressMiddleware =
        params.length >= 3 &&
        (params[0]?.name.getText().toLowerCase().includes("req") ||
          params[1]?.name.getText().toLowerCase().includes("res") ||
          params[2]?.name.getText().toLowerCase().includes("next"));

      const isNamedMiddleware =
        fnName.toLowerCase().includes("middleware") ||
        fnName.toLowerCase().includes("guard") ||
        fnName.toLowerCase().includes("auth") ||
        fnName.toLowerCase().includes("handler");

      if (isExpressMiddleware || isNamedMiddleware) {
        const { line: startLine, character: startCol } =
          sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(
          node.getEnd(),
        );

        const id = `mw:${normalizedPath}:${fnName}:${startLine + 1}:${startCol + 1}`;
        middleware.push({
          id,
          name: fnName,
          filePath: normalizedPath,
          kind: classifyMiddlewareKind(fnName),
          scope: "route",
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
  return { services, repositories, middleware };
}
