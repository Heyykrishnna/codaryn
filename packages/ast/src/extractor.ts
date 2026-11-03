import ts from "typescript";
import type {
  AstDiagnostic,
  ClassProperty,
  ClassSymbol,
  FunctionParameter,
  FunctionSymbol,
  ImportExportSymbol,
  InterfaceSymbol,
  SourceLocation,
  TypeAliasSymbol,
  TypeProperty,
} from "@codaryn/contracts";
import {
  createEmptySymbolInventory,
  generateSymbolId,
  type SymbolInventory,
} from "@codaryn/symbols";

export type FileAnalysisResult = {
  path: string;
  inventory: SymbolInventory;
  diagnostics: AstDiagnostic[];
};

export function getNodeLocation(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): SourceLocation {
  const start = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile, false),
  );
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
  const path = sourceFile.fileName.replace(/\\/g, "/").replace(/^\/+/, "");

  return {
    path,
    startLine: start.line + 1,
    startColumn: start.character + 1,
    endLine: end.line + 1,
    endColumn: end.character + 1,
  };
}

function getModifiers(node: ts.Node, sourceFile: ts.SourceFile): string[] {
  if (!ts.canHaveModifiers(node)) return [];
  const modifiers = ts.getModifiers(node);
  if (!modifiers) return [];
  return modifiers.map((m) => m.getText(sourceFile));
}

function extractParameters(
  parameters: ts.NodeArray<ts.ParameterDeclaration>,
  sourceFile: ts.SourceFile,
): FunctionParameter[] {
  return parameters.map((param) => {
    const name = param.name.getText(sourceFile);
    const type = param.type ? param.type.getText(sourceFile) : "any";
    const optional = Boolean(param.questionToken) || Boolean(param.initializer);
    const defaultValue = param.initializer
      ? param.initializer.getText(sourceFile)
      : undefined;
    return { name, type, optional, defaultValue };
  });
}

export function extractFileSymbols(
  sourceFile: ts.SourceFile,
): FileAnalysisResult {
  const normPath = sourceFile.fileName.replace(/\\/g, "/").replace(/^\/+/, "");
  const inventory = createEmptySymbolInventory();
  const diagnostics: AstDiagnostic[] = [];

  const parseDiags = (
    sourceFile as unknown as { parseDiagnostics?: ts.DiagnosticWithLocation[] }
  ).parseDiagnostics;
  if (parseDiags && Array.isArray(parseDiags)) {
    for (const diag of parseDiags) {
      const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
      const loc = diag.file
        ? {
            path: normPath,
            startLine:
              diag.file.getLineAndCharacterOfPosition(diag.start).line + 1,
            startColumn:
              diag.file.getLineAndCharacterOfPosition(diag.start).character + 1,
            endLine:
              diag.file.getLineAndCharacterOfPosition(
                diag.start + (diag.length ?? 0),
              ).line + 1,
            endColumn:
              diag.file.getLineAndCharacterOfPosition(
                diag.start + (diag.length ?? 0),
              ).character + 1,
          }
        : undefined;

      diagnostics.push({
        id: `diag:${normPath}:${diag.code}:${loc?.startLine ?? 1}:${loc?.startColumn ?? 1}`,
        path: normPath,
        message,
        severity:
          diag.category === ts.DiagnosticCategory.Error ? "error" : "warning",
        code: `TS${diag.code}`,
        location: loc,
      });
    }
  }

  function visit(node: ts.Node) {
    try {
      if (ts.isFunctionDeclaration(node) && node.name) {
        const name = node.name.getText(sourceFile);
        const loc = getNodeLocation(node, sourceFile);
        const modifiers = getModifiers(node, sourceFile);
        const returnType = node.type ? node.type.getText(sourceFile) : "void";
        const isAsync = modifiers.includes("async");
        const isGenerator = Boolean(node.asteriskToken);

        inventory.functions.push({
          id: generateSymbolId(
            normPath,
            "function",
            name,
            loc.startLine,
            loc.startColumn,
          ),
          name,
          kind: "function",
          parameters: extractParameters(node.parameters, sourceFile),
          returnType,
          modifiers,
          isAsync,
          isGenerator,
          location: loc,
        });
      } else if (
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.length > 0
      ) {
        const statementModifiers = getModifiers(node, sourceFile);
        for (const decl of node.declarationList.declarations) {
          if (
            decl.initializer &&
            (ts.isArrowFunction(decl.initializer) ||
              ts.isFunctionExpression(decl.initializer)) &&
            ts.isIdentifier(decl.name)
          ) {
            const name = decl.name.getText(sourceFile);
            const loc = getNodeLocation(decl, sourceFile);
            const fnNode = decl.initializer;
            const returnType = fnNode.type
              ? fnNode.type.getText(sourceFile)
              : "any";
            const fnModifiers = getModifiers(fnNode, sourceFile);
            const allModifiers = [
              ...new Set([...statementModifiers, ...fnModifiers]),
            ];
            const isAsync = allModifiers.includes("async");
            const isGenerator =
              ts.isFunctionExpression(fnNode) && Boolean(fnNode.asteriskToken);

            inventory.functions.push({
              id: generateSymbolId(
                normPath,
                "function",
                name,
                loc.startLine,
                loc.startColumn,
              ),
              name,
              kind: "function",
              parameters: extractParameters(fnNode.parameters, sourceFile),
              returnType,
              modifiers: allModifiers,
              isAsync,
              isGenerator,
              location: loc,
            });
          }
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        const name = node.name.getText(sourceFile);
        const loc = getNodeLocation(node, sourceFile);
        const modifiers = getModifiers(node, sourceFile);
        let extendsClause: string | undefined;
        const implementsClauses: string[] = [];

        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
              extendsClause = clause.types[0]?.expression.getText(sourceFile);
            } else if (clause.token === ts.SyntaxKind.ImplementsKeyword) {
              for (const type of clause.types) {
                implementsClauses.push(type.expression.getText(sourceFile));
              }
            }
          }
        }

        const methods: FunctionSymbol[] = [];
        const properties: ClassProperty[] = [];

        for (const member of node.members) {
          if (ts.isMethodDeclaration(member) && member.name) {
            const mName = member.name.getText(sourceFile);
            const mLoc = getNodeLocation(member, sourceFile);
            const mModifiers = getModifiers(member, sourceFile);
            const mReturnType = member.type
              ? member.type.getText(sourceFile)
              : "void";
            methods.push({
              id: generateSymbolId(
                normPath,
                "method",
                `${name}.${mName}`,
                mLoc.startLine,
                mLoc.startColumn,
              ),
              name: mName,
              kind: "method",
              parameters: extractParameters(member.parameters, sourceFile),
              returnType: mReturnType,
              modifiers: mModifiers,
              isAsync: mModifiers.includes("async"),
              isGenerator: Boolean(member.asteriskToken),
              location: mLoc,
              parentName: name,
            });
          } else if (ts.isPropertyDeclaration(member) && member.name) {
            const pName = member.name.getText(sourceFile);
            const pType = member.type ? member.type.getText(sourceFile) : "any";
            const pModifiers = getModifiers(member, sourceFile);
            properties.push({
              name: pName,
              type: pType,
              modifiers: pModifiers,
              optional: Boolean(member.questionToken),
            });
          }
        }

        inventory.classes.push({
          id: generateSymbolId(
            normPath,
            "class",
            name,
            loc.startLine,
            loc.startColumn,
          ),
          name,
          extends: extendsClause,
          implements: implementsClauses,
          methods,
          properties,
          modifiers,
          location: loc,
        });
      } else if (ts.isInterfaceDeclaration(node)) {
        const name = node.name.getText(sourceFile);
        const loc = getNodeLocation(node, sourceFile);
        const extendsClauses: string[] = [];
        if (node.heritageClauses) {
          for (const clause of node.heritageClauses) {
            if (clause.token === ts.SyntaxKind.ExtendsKeyword) {
              for (const type of clause.types) {
                extendsClauses.push(type.expression.getText(sourceFile));
              }
            }
          }
        }

        const properties: TypeProperty[] = [];
        const methods: FunctionSymbol[] = [];

        for (const member of node.members) {
          if (ts.isPropertySignature(member) && member.name) {
            const pName = member.name.getText(sourceFile);
            const pType = member.type ? member.type.getText(sourceFile) : "any";
            const isReadonly = Boolean(
              member.modifiers?.some(
                (m) => m.kind === ts.SyntaxKind.ReadonlyKeyword,
              ),
            );
            properties.push({
              name: pName,
              type: pType,
              optional: Boolean(member.questionToken),
              readonly: isReadonly,
            });
          } else if (ts.isMethodSignature(member) && member.name) {
            const mName = member.name.getText(sourceFile);
            const mLoc = getNodeLocation(member, sourceFile);
            const mReturnType = member.type
              ? member.type.getText(sourceFile)
              : "void";
            methods.push({
              id: generateSymbolId(
                normPath,
                "method",
                `${name}.${mName}`,
                mLoc.startLine,
                mLoc.startColumn,
              ),
              name: mName,
              kind: "method",
              parameters: extractParameters(member.parameters, sourceFile),
              returnType: mReturnType,
              modifiers: [],
              isAsync: false,
              isGenerator: false,
              location: mLoc,
              parentName: name,
            });
          }
        }

        inventory.interfaces.push({
          id: generateSymbolId(
            normPath,
            "interface",
            name,
            loc.startLine,
            loc.startColumn,
          ),
          name,
          extends: extendsClauses,
          properties,
          methods,
          location: loc,
        });
      } else if (ts.isTypeAliasDeclaration(node)) {
        const name = node.name.getText(sourceFile);
        const loc = getNodeLocation(node, sourceFile);
        const type = node.type.getText(sourceFile);

        inventory.types.push({
          id: generateSymbolId(
            normPath,
            "typeAlias",
            name,
            loc.startLine,
            loc.startColumn,
          ),
          name,
          type,
          location: loc,
        });
      } else if (ts.isImportDeclaration(node)) {
        const loc = getNodeLocation(node, sourceFile);
        const moduleSpecifier = ts.isStringLiteral(node.moduleSpecifier)
          ? node.moduleSpecifier.text
          : node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, "");

        const isTypeOnly = Boolean(node.importClause?.isTypeOnly);
        let isDefault = false;
        let isNamespace = false;
        const specifiers: { name: string; alias?: string }[] = [];

        if (node.importClause) {
          if (node.importClause.name) {
            isDefault = true;
            specifiers.push({
              name: node.importClause.name.getText(sourceFile),
            });
          }
          if (node.importClause.namedBindings) {
            if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              isNamespace = true;
              specifiers.push({
                name: node.importClause.namedBindings.name.getText(sourceFile),
              });
            } else if (ts.isNamedImports(node.importClause.namedBindings)) {
              for (const element of node.importClause.namedBindings.elements) {
                specifiers.push({
                  name: element.propertyName
                    ? element.propertyName.getText(sourceFile)
                    : element.name.getText(sourceFile),
                  alias: element.propertyName
                    ? element.name.getText(sourceFile)
                    : undefined,
                });
              }
            }
          }
        }

        inventory.importsExports.push({
          id: generateSymbolId(
            normPath,
            "import",
            moduleSpecifier,
            loc.startLine,
            loc.startColumn,
          ),
          kind: "import",
          moduleSpecifier,
          isTypeOnly,
          isDefault,
          isNamespace,
          specifiers,
          location: loc,
        });
      } else if (ts.isExportDeclaration(node)) {
        const loc = getNodeLocation(node, sourceFile);
        const moduleSpecifier = node.moduleSpecifier
          ? ts.isStringLiteral(node.moduleSpecifier)
            ? node.moduleSpecifier.text
            : node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, "")
          : "";

        const isTypeOnly = Boolean(node.isTypeOnly);
        const specifiers: { name: string; alias?: string }[] = [];

        if (node.exportClause && ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            specifiers.push({
              name: element.propertyName
                ? element.propertyName.getText(sourceFile)
                : element.name.getText(sourceFile),
              alias: element.propertyName
                ? element.name.getText(sourceFile)
                : undefined,
            });
          }
        }

        inventory.importsExports.push({
          id: generateSymbolId(
            normPath,
            "export",
            moduleSpecifier || "self",
            loc.startLine,
            loc.startColumn,
          ),
          kind: "export",
          moduleSpecifier,
          isTypeOnly,
          isDefault: false,
          isNamespace: false,
          specifiers,
          location: loc,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      diagnostics.push({
        id: `diag:${normPath}:UNSUPPORTED_CONSTRUCT:${diagnostics.length + 1}:1`,
        path: normPath,
        message: `Unsupported construct: ${message}`,
        severity: "warning",
        code: "UNSUPPORTED_CONSTRUCT",
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    path: normPath,
    inventory,
    diagnostics,
  };
}
