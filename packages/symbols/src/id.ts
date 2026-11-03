import type {
  ClassSymbol,
  FunctionSymbol,
  ImportExportSymbol,
  InterfaceSymbol,
  TypeAliasSymbol,
} from "@codaryn/contracts";

export function generateSymbolId(
  filePath: string,
  kind: string,
  name: string,
  startLine: number,
  startColumn: number,
): string {
  const normPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `sym:${normPath}:${kind}:${name}:${startLine}:${startColumn}`;
}

export type SymbolInventory = {
  functions: FunctionSymbol[];
  classes: ClassSymbol[];
  interfaces: InterfaceSymbol[];
  types: TypeAliasSymbol[];
  importsExports: ImportExportSymbol[];
};

export function createEmptySymbolInventory(): SymbolInventory {
  return {
    functions: [],
    classes: [],
    interfaces: [],
    types: [],
    importsExports: [],
  };
}

export function mergeSymbolInventories(
  inventories: SymbolInventory[],
): SymbolInventory {
  const result = createEmptySymbolInventory();
  for (const inv of inventories) {
    result.functions.push(...inv.functions);
    result.classes.push(...inv.classes);
    result.interfaces.push(...inv.interfaces);
    result.types.push(...inv.types);
    result.importsExports.push(...inv.importsExports);
  }

  result.functions.sort((a, b) => a.id.localeCompare(b.id));
  result.classes.sort((a, b) => a.id.localeCompare(b.id));
  result.interfaces.sort((a, b) => a.id.localeCompare(b.id));
  result.types.sort((a, b) => a.id.localeCompare(b.id));
  result.importsExports.sort((a, b) => a.id.localeCompare(b.id));

  return result;
}
