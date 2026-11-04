import ts from "typescript";
import type {
  ApiClientKind,
  FrontendApiClientCall,
  FrontendComponent,
  FrontendState,
  HttpMethod,
  StateKind,
} from "@codaryn/contracts";
import { generateSymbolId } from "@codaryn/symbols";

export interface StateAndApiResult {
  readonly state: readonly FrontendState[];
  readonly apiCalls: readonly FrontendApiClientCall[];
}

function parseHttpMethod(methodStr: string): HttpMethod {
  const upper = methodStr.toUpperCase();
  if (
    upper === "GET" ||
    upper === "POST" ||
    upper === "PUT" ||
    upper === "PATCH" ||
    upper === "DELETE" ||
    upper === "HEAD" ||
    upper === "OPTIONS"
  ) {
    return upper;
  }
  return "CUSTOM";
}

function findEnclosingComponent(
  node: ts.Node,
  sourceFile: ts.SourceFile,
  components: readonly FrontendComponent[],
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

export function extractStateAndApiCalls(
  sourceFile: ts.SourceFile,
  filePath: string,
  components: readonly FrontendComponent[],
): StateAndApiResult {
  const stateList: FrontendState[] = [];
  const apiCalls: FrontendApiClientCall[] = [];

  function recordState(
    node: ts.Node,
    componentId: string,
    kind: StateKind,
    identifier: string,
    initial: Pick<FrontendState, "initialValue"> = {},
  ) {
    const start = sourceFile.getLineAndCharacterOfPosition(
      node.getStart(sourceFile),
    );
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    const startLine = start.line + 1;
    stateList.push({
      id: generateSymbolId(
        filePath,
        "state",
        `${componentId}_${identifier}`,
        startLine,
        start.character + 1,
      ),
      componentId,
      kind,
      identifier,
      ...initial,
      sourceEvidence: {
        path: filePath,
        startLine,
        endLine: Math.max(startLine, end.line + 1),
      },
    });
  }
  function visit(node: ts.Node): void {
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (decl.initializer && ts.isCallExpression(decl.initializer)) {
          const callText = decl.initializer.expression.getText(sourceFile);

          if (callText === "useState" || callText === "useReducer") {
            const enclosingComp = findEnclosingComponent(
              node,
              sourceFile,
              components,
            );
            if (enclosingComp) {
              let identifier = "state";
              if (
                ts.isArrayBindingPattern(decl.name) &&
                decl.name.elements.length > 0
              ) {
                const first = decl.name.elements[0];
                if (
                  first &&
                  ts.isBindingElement(first) &&
                  ts.isIdentifier(first.name)
                ) {
                  identifier = first.name.text;
                }
              }

              const initialValue =
                decl.initializer.arguments[0]?.getText(sourceFile);
              recordState(node, enclosingComp.id, "local", identifier, {
                initialValue: initialValue,
              });
            }
          } else if (callText === "useContext") {
            const enclosingComp = findEnclosingComponent(
              node,
              sourceFile,
              components,
            );
            if (enclosingComp && ts.isIdentifier(decl.name)) {
              const identifier = decl.name.text;
              const contextArg =
                decl.initializer.arguments[0]?.getText(sourceFile);
              recordState(node, enclosingComp.id, "context", identifier, {
                initialValue: contextArg,
              });
            }
          } else if (callText === "useSelector" || callText === "useDispatch") {
            const enclosingComp = findEnclosingComponent(
              node,
              sourceFile,
              components,
            );
            if (enclosingComp && ts.isIdentifier(decl.name)) {
              const identifier = decl.name.text;
              recordState(node, enclosingComp.id, "redux", identifier);
            }
          } else if (callText === "useQuery" || callText === "useMutation") {
            const enclosingComp = findEnclosingComponent(
              node,
              sourceFile,
              components,
            );
            if (enclosingComp) {
              let identifier = "queryResult";
              if (ts.isIdentifier(decl.name)) {
                identifier = decl.name.text;
              } else if (ts.isObjectBindingPattern(decl.name)) {
                identifier = decl.name.getText(sourceFile);
              }
              recordState(node, enclosingComp.id, "query", identifier);
            }
          } else if (callText === "create" || callText.endsWith(".create")) {
            const enclosingComp = findEnclosingComponent(
              node,
              sourceFile,
              components,
            );
            const compId = enclosingComp?.id ?? "global";
            const identifier = ts.isIdentifier(decl.name)
              ? decl.name.text
              : "zustandStore";
            recordState(node, compId, "zustand", identifier);
          }
        }
      }
    } else if (ts.isCallExpression(node)) {
      const callText = node.expression.getText(sourceFile);
      let clientType: ApiClientKind | undefined;
      let method: HttpMethod = "GET";
      let endpoint: string | undefined;
      let isDynamic = false;

      if (callText === "fetch") {
        clientType = "fetch";
        const firstArg = node.arguments[0];
        if (firstArg) {
          if (ts.isStringLiteral(firstArg)) {
            endpoint = firstArg.text;
            isDynamic = false;
          } else {
            endpoint = firstArg.getText(sourceFile);
            isDynamic = true;
          }
        }

        const optionsArg = node.arguments[1];
        if (optionsArg && ts.isObjectLiteralExpression(optionsArg)) {
          for (const prop of optionsArg.properties) {
            if (
              ts.isPropertyAssignment(prop) &&
              ts.isIdentifier(prop.name) &&
              prop.name.text === "method" &&
              ts.isStringLiteral(prop.initializer)
            ) {
              method = parseHttpMethod(prop.initializer.text);
            }
          }
        }
      } else if (callText.startsWith("axios.") || callText === "axios") {
        clientType = "axios";
        const parts = callText.split(".");
        if (parts.length > 1 && parts[1]) {
          method = parseHttpMethod(parts[1]);
        }
        const firstArg = node.arguments[0];
        if (firstArg) {
          if (ts.isStringLiteral(firstArg)) {
            endpoint = firstArg.text;
            isDynamic = false;
          } else {
            endpoint = firstArg.getText(sourceFile);
            isDynamic = true;
          }
        }
      } else if (
        /\b(?:api|client|http)\.(get|post|put|delete|patch)\b/.test(callText)
      ) {
        clientType = "custom";
        const match = /\.(get|post|put|delete|patch)$/.exec(callText);
        if (match && match[1]) {
          method = parseHttpMethod(match[1]);
        }
        const firstArg = node.arguments[0];
        if (firstArg) {
          if (ts.isStringLiteral(firstArg)) {
            endpoint = firstArg.text;
            isDynamic = false;
          } else {
            endpoint = firstArg.getText(sourceFile);
            isDynamic = true;
          }
        }
      }

      if (clientType && endpoint) {
        const enclosingComp = findEnclosingComponent(
          node,
          sourceFile,
          components,
        );
        const compId = enclosingComp?.id ?? "module";

        const start = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const startLine = start.line + 1;
        const startColumn = start.character + 1;
        const endLine = Math.max(startLine, end.line + 1);

        const id = generateSymbolId(
          filePath,
          "api",
          `${compId}_${method}_${startLine}_${startColumn}`,
          startLine,
          startColumn,
        );

        apiCalls.push({
          id,
          componentId: compId,
          filePath,
          method,
          endpoint,
          isDynamic,
          clientType,
          sourceEvidence: {
            path: filePath,
            startLine,
            endLine,
          },
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    state: stateList.sort((a, b) => a.id.localeCompare(b.id)),
    apiCalls: apiCalls.sort((a, b) => a.id.localeCompare(b.id)),
  };
}
