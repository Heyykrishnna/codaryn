import ts from "typescript";
import type {
  FrontendComponent,
  FrontendContext,
  FrontendHookCall,
  HookKind,
} from "@codaryn/contracts";
import { generateSymbolId } from "@codaryn/symbols";

export interface HooksAndContextsResult {
  readonly hooks: readonly FrontendHookCall[];
  readonly contexts: readonly FrontendContext[];
  readonly updatedComponents: readonly FrontendComponent[];
}

function classifyHookKind(name: string): HookKind {
  if (name === "useState" || name === "useReducer") return "state";
  if (
    name === "useEffect" ||
    name === "useLayoutEffect" ||
    name === "useInsertionEffect"
  ) {
    return "effect";
  }
  if (name === "useContext") return "context";
  if (name === "useRef" || name === "useImperativeHandle") return "ref";
  if (name === "useCallback") return "callback";
  if (name === "useMemo") return "memo";
  if (/^use[A-Z0-9]/.test(name)) return "custom";
  return "other";
}

function extractHookDependencies(
  node: ts.CallExpression,
): string[] | undefined {
  if (node.arguments.length < 2) return undefined;
  const depsArg = node.arguments[1];
  if (depsArg && ts.isArrayLiteralExpression(depsArg)) {
    const deps: string[] = [];
    for (const el of depsArg.elements) {
      deps.push(el.getText());
    }
    return deps.sort((a, b) => a.localeCompare(b));
  }
  return undefined;
}

export function extractHooksAndContexts(
  sourceFile: ts.SourceFile,
  filePath: string,
  components: readonly FrontendComponent[],
): HooksAndContextsResult {
  const hooks: FrontendHookCall[] = [];
  const contextsMap = new Map<
    string,
    {
      id: string;
      name: string;
      filePath: string;
      defaultValue?: string;
      providerComponentIds: Set<string>;
      consumerComponentIds: Set<string>;
      startLine: number;
      endLine: number;
    }
  >();

  for (const statement of sourceFile.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (
          ts.isIdentifier(decl.name) &&
          decl.initializer &&
          ts.isCallExpression(decl.initializer)
        ) {
          const callText = decl.initializer.expression.getText(sourceFile);
          if (
            callText === "createContext" ||
            callText === "React.createContext"
          ) {
            const contextName = decl.name.text;
            const start = sourceFile.getLineAndCharacterOfPosition(
              statement.getStart(sourceFile),
            );
            const end = sourceFile.getLineAndCharacterOfPosition(
              statement.getEnd(),
            );
            const startLine = start.line + 1;
            const startColumn = start.character + 1;
            const endLine = Math.max(startLine, end.line + 1);

            const id = generateSymbolId(
              filePath,
              "context",
              contextName,
              startLine,
              startColumn,
            );

            const defaultValue =
              decl.initializer.arguments[0]?.getText(sourceFile);

            contextsMap.set(contextName, {
              id,
              name: contextName,
              filePath,
              defaultValue,
              providerComponentIds: new Set<string>(),
              consumerComponentIds: new Set<string>(),
              startLine,
              endLine,
            });
          }
        }
      }
    }
  }

  const componentHookCounts = new Map<string, number>();

  function findEnclosingComponent(
    node: ts.Node,
  ): FrontendComponent | undefined {
    let current = node.parent;
    while (current) {
      if (
        ts.isFunctionDeclaration(current) ||
        ts.isArrowFunction(current) ||
        ts.isFunctionExpression(current) ||
        ts.isClassDeclaration(current)
      ) {
        const start = sourceFile.getLineAndCharacterOfPosition(
          current.getStart(sourceFile),
        );
        const line = start.line + 1;
        for (const comp of components) {
          if (
            line >= comp.sourceEvidence.startLine &&
            line <= comp.sourceEvidence.endLine
          ) {
            return comp;
          }
        }
      }
      current = current.parent;
    }
    return undefined;
  }

  function visit(node: ts.Node): void {
    if (ts.isCallExpression(node)) {
      let callName = "";
      if (ts.isIdentifier(node.expression)) {
        callName = node.expression.text;
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        callName = node.expression.name.text;
      }

      if (/^use[A-Z0-9]/.test(callName)) {
        const enclosingComp = findEnclosingComponent(node);
        if (enclosingComp) {
          const start = sourceFile.getLineAndCharacterOfPosition(
            node.getStart(sourceFile),
          );
          const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
          const startLine = start.line + 1;
          const startColumn = start.character + 1;
          const endLine = Math.max(startLine, end.line + 1);

          const hookId = generateSymbolId(
            filePath,
            "hook",
            `${enclosingComp.id}_${callName}`,
            startLine,
            startColumn,
          );

          const hookKind = classifyHookKind(callName);
          const deps = extractHookDependencies(node);

          hooks.push({
            id: hookId,
            componentId: enclosingComp.id,
            name: callName,
            kind: hookKind,
            dependencies: deps,
            sourceEvidence: {
              path: filePath,
              startLine,
              endLine,
            },
          });

          componentHookCounts.set(
            enclosingComp.id,
            (componentHookCounts.get(enclosingComp.id) ?? 0) + 1,
          );

          if (callName === "useContext" && node.arguments.length > 0) {
            const contextArg = node.arguments[0]?.getText(sourceFile);
            if (contextArg && contextsMap.has(contextArg)) {
              contextsMap
                .get(contextArg)
                ?.consumerComponentIds.add(enclosingComp.id);
            }
          }
        }
      }
    } else if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagNameNode = ts.isJsxElement(node)
        ? node.openingElement.tagName
        : node.tagName;
      const tagText = tagNameNode.getText(sourceFile);

      if (tagText.endsWith(".Provider")) {
        const contextName = tagText.slice(0, -9);
        const enclosingComp = findEnclosingComponent(node);
        if (enclosingComp && contextsMap.has(contextName)) {
          contextsMap
            .get(contextName)
            ?.providerComponentIds.add(enclosingComp.id);
        }
      } else if (tagText.endsWith(".Consumer")) {
        const contextName = tagText.slice(0, -9);
        const enclosingComp = findEnclosingComponent(node);
        if (enclosingComp && contextsMap.has(contextName)) {
          contextsMap
            .get(contextName)
            ?.consumerComponentIds.add(enclosingComp.id);
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const contexts: FrontendContext[] = [];
  for (const [, ctx] of contextsMap.entries()) {
    contexts.push({
      id: ctx.id,
      name: ctx.name,
      filePath: ctx.filePath,
      defaultValue: ctx.defaultValue,
      providerComponentIds: [...ctx.providerComponentIds].sort((a, b) =>
        a.localeCompare(b),
      ),
      consumerComponentIds: [...ctx.consumerComponentIds].sort((a, b) =>
        a.localeCompare(b),
      ),
      sourceEvidence: {
        path: filePath,
        startLine: ctx.startLine,
        endLine: ctx.endLine,
      },
    });
  }

  const updatedComponents = components.map((c) => ({
    ...c,
    hooksCount: componentHookCounts.get(c.id) ?? c.hooksCount,
  }));

  return {
    hooks: hooks.sort((a, b) => a.id.localeCompare(b.id)),
    contexts: contexts.sort((a, b) => a.name.localeCompare(b.name)),
    updatedComponents: updatedComponents.sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
  };
}
