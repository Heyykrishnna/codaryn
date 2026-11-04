import ts from "typescript";
import type {
  ComponentExportType,
  ComponentKind,
  ComponentProp,
  FrontendComponent,
  FrontendJsxElement,
} from "@codaryn/contracts";
import { generateSymbolId } from "@codaryn/symbols";

export interface ComponentExtractionResult {
  readonly components: readonly FrontendComponent[];
  readonly jsxElements: readonly FrontendJsxElement[];
}

function isPascalCase(name: string): boolean {
  if (!name || name.length === 0) return false;
  const first = name.charAt(0);
  return first === first.toUpperCase() && first !== first.toLowerCase();
}

function hasJsxReturnOrChild(node: ts.Node): boolean {
  let hasJsx = false;
  function visit(child: ts.Node): void {
    if (hasJsx) return;
    if (
      ts.isJsxElement(child) ||
      ts.isJsxSelfClosingElement(child) ||
      ts.isJsxFragment(child)
    ) {
      hasJsx = true;
      return;
    }
    ts.forEachChild(child, visit);
  }
  visit(node);
  return hasJsx;
}

function extractMembersFromType(
  typeNode: ts.Node,
  props: ComponentProp[],
): void {
  if (ts.isTypeLiteralNode(typeNode) || ts.isInterfaceDeclaration(typeNode)) {
    for (const member of typeNode.members) {
      if (
        ts.isPropertySignature(member) &&
        member.name &&
        ts.isIdentifier(member.name)
      ) {
        props.push({
          name: member.name.text,
          type: member.type ? member.type.getText() : undefined,
          required: member.questionToken === undefined,
        });
      }
    }
  }
}

function extractProps(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): ComponentProp[] {
  const props: ComponentProp[] = [];
  let param: ts.ParameterDeclaration | undefined;

  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  ) {
    param = node.parameters[0];
  } else if (ts.isClassDeclaration(node)) {
    const constructor = node.members.find(ts.isConstructorDeclaration);
    param = constructor?.parameters[0];
  }

  if (!param) return props;

  if (param.type) {
    if (ts.isTypeLiteralNode(param.type)) {
      extractMembersFromType(param.type, props);
    } else if (ts.isTypeReferenceNode(param.type)) {
      const typeName = param.type.typeName.getText(sourceFile);
      for (const stmt of sourceFile.statements) {
        if (ts.isInterfaceDeclaration(stmt) && stmt.name.text === typeName) {
          extractMembersFromType(stmt, props);
        } else if (
          ts.isTypeAliasDeclaration(stmt) &&
          stmt.name.text === typeName &&
          ts.isTypeLiteralNode(stmt.type)
        ) {
          extractMembersFromType(stmt.type, props);
        }
      }
    }
  } else if (ts.isObjectBindingPattern(param.name)) {
    for (const element of param.name.elements) {
      if (ts.isBindingElement(element) && ts.isIdentifier(element.name)) {
        props.push({
          name: element.name.text,
          required: element.initializer === undefined,
        });
      }
    }
  }

  return props.sort((a, b) => a.name.localeCompare(b.name));
}

function isInsideCondition(node: ts.Node): boolean {
  let current = node.parent;
  while (current) {
    if (
      ts.isConditionalExpression(current) ||
      ts.isIfStatement(current) ||
      (ts.isBinaryExpression(current) &&
        (current.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
          current.operatorToken.kind === ts.SyntaxKind.BarBarToken))
    ) {
      return true;
    }
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isArrowFunction(current) ||
      ts.isFunctionExpression(current) ||
      ts.isMethodDeclaration(current)
    ) {
      break;
    }
    current = current.parent;
  }
  return false;
}

function extractJsxElements(
  componentNode: ts.Node,
  componentId: string,
  sourceFile: ts.SourceFile,
  repositoryId: string,
  filePath: string,
): FrontendJsxElement[] {
  const elements: FrontendJsxElement[] = [];

  function visit(node: ts.Node): void {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagNameNode = ts.isJsxElement(node)
        ? node.openingElement.tagName
        : node.tagName;
      const tagName = tagNameNode.getText(sourceFile);

      if (isPascalCase(tagName) || tagName.includes(".")) {
        const attributes = ts.isJsxElement(node)
          ? node.openingElement.attributes
          : node.attributes;
        const propNames: string[] = [];
        for (const prop of attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name) {
            propNames.push(prop.name.getText(sourceFile));
          }
        }

        const start = sourceFile.getLineAndCharacterOfPosition(
          node.getStart(sourceFile),
        );
        const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
        const startLine = start.line + 1;
        const startColumn = start.character + 1;
        const endLine = Math.max(startLine, end.line + 1);

        const elementId = generateSymbolId(
          filePath,
          "jsx",
          `${componentId}_${tagName}`,
          startLine,
          startColumn,
        );

        elements.push({
          id: elementId,
          sourceComponentId: componentId,
          targetComponentName: tagName,
          targetComponentId: null,
          props: propNames.sort((a, b) => a.localeCompare(b)),
          isConditional: isInsideCondition(node),
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

  visit(componentNode);
  return elements.sort((a, b) => a.id.localeCompare(b.id));
}

function getExportType(
  node: ts.Node,
  identifierName: string,
  sourceFile: ts.SourceFile,
): ComponentExportType {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;
  if (modifiers) {
    const isDefault = modifiers.some(
      (m) => m.kind === ts.SyntaxKind.DefaultKeyword,
    );
    const isExport = modifiers.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (isDefault) return "default";
    if (isExport) return "named";
  }

  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      if (statement.expression.getText(sourceFile) === identifierName) {
        return "default";
      }
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const spec of statement.exportClause.elements) {
          if (spec.name.text === identifierName) {
            return "named";
          }
        }
      }
    }
  }

  return "internal";
}

export function extractComponentsAndJsx(
  sourceFile: ts.SourceFile,
  repositoryId: string,
  filePath: string,
): ComponentExtractionResult {
  const components: FrontendComponent[] = [];
  const allJsx: FrontendJsxElement[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      const name = statement.name.text;
      if (isPascalCase(name) && hasJsxReturnOrChild(statement)) {
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
          "component",
          name,
          startLine,
          startColumn,
        );
        const props = extractProps(statement, sourceFile);
        const jsx = extractJsxElements(
          statement,
          id,
          sourceFile,
          repositoryId,
          filePath,
        );
        allJsx.push(...jsx);

        components.push({
          id,
          name,
          filePath,
          kind: "function",
          exportType: getExportType(statement, name, sourceFile),
          props,
          hooksCount: 0,
          renderedComponentsCount: jsx.length,
          sourceEvidence: {
            path: filePath,
            startLine,
            endLine,
          },
        });
      }
    } else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const name = decl.name.text;
          if (!isPascalCase(name)) continue;

          let kind: ComponentKind = "arrow";
          let compNode: ts.Node | undefined;

          if (decl.initializer) {
            if (
              ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer)
            ) {
              if (hasJsxReturnOrChild(decl.initializer)) {
                kind = ts.isArrowFunction(decl.initializer)
                  ? "arrow"
                  : "function";
                compNode = decl.initializer;
              }
            } else if (ts.isCallExpression(decl.initializer)) {
              const callText = decl.initializer.expression.getText(sourceFile);
              if (callText.includes("memo")) {
                kind = "memo";
                compNode = decl.initializer;
              } else if (callText.includes("forwardRef")) {
                kind = "forward_ref";
                compNode = decl.initializer;
              } else if (callText.includes("lazy")) {
                kind = "lazy";
                compNode = decl.initializer;
              }
            }
          }

          if (compNode) {
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
              "component",
              name,
              startLine,
              startColumn,
            );
            const props = extractProps(compNode, sourceFile);
            const jsx = extractJsxElements(
              compNode,
              id,
              sourceFile,
              repositoryId,
              filePath,
            );
            allJsx.push(...jsx);

            components.push({
              id,
              name,
              filePath,
              kind,
              exportType: getExportType(statement, name, sourceFile),
              props,
              hooksCount: 0,
              renderedComponentsCount: jsx.length,
              sourceEvidence: {
                path: filePath,
                startLine,
                endLine,
              },
            });
          }
        }
      }
    } else if (ts.isClassDeclaration(statement) && statement.name) {
      const name = statement.name.text;
      if (isPascalCase(name) && hasJsxReturnOrChild(statement)) {
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
          "component",
          name,
          startLine,
          startColumn,
        );
        const props = extractProps(statement, sourceFile);
        const jsx = extractJsxElements(
          statement,
          id,
          sourceFile,
          repositoryId,
          filePath,
        );
        allJsx.push(...jsx);

        components.push({
          id,
          name,
          filePath,
          kind: "class",
          exportType: getExportType(statement, name, sourceFile),
          props,
          hooksCount: 0,
          renderedComponentsCount: jsx.length,
          sourceEvidence: {
            path: filePath,
            startLine,
            endLine,
          },
        });
      }
    }
  }

  return {
    components: components.sort((a, b) => a.name.localeCompare(b.name)),
    jsxElements: allJsx.sort((a, b) => a.id.localeCompare(b.id)),
  };
}
