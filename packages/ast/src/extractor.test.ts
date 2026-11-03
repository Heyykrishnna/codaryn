import { test } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import { extractFileSymbols } from "./extractor.js";

test("extractFileSymbols extracts functions, classes, interfaces, types, imports, and exports", () => {
  const code = `
import React, { useState } from "react";
import type { User } from "./types.js";
export { helper } from "./helper.js";

export interface Account extends Entity {
  id: string;
  readonly balance: number;
  deposit(amount: number): void;
}

export type Status = "active" | "suspended";

export class BankService implements IService {
  private logger: string;

  constructor() {
    this.logger = "bank";
  }

  public async transfer(from: string, to: string, amount: number = 0): Promise<boolean> {
    return true;
  }
}

export async function processPayment(id: string): Promise<void> {}
export const computeRate = (rate: number): number => rate * 1.05;
`;

  const sourceFile = ts.createSourceFile(
    "src/service.ts",
    code,
    ts.ScriptTarget.Latest,
    true,
  );

  const result = extractFileSymbols(sourceFile);
  assert.equal(result.diagnostics.length, 0);

  assert.equal(result.inventory.importsExports.length, 3);
  const reactImport = result.inventory.importsExports.find(
    (item) => item.moduleSpecifier === "react",
  );
  assert.ok(reactImport);
  assert.equal(reactImport.isDefault, true);

  const iface = result.inventory.interfaces.find(
    (item) => item.name === "Account",
  );
  assert.ok(iface);
  assert.equal(iface.properties.length, 2);
  assert.equal(iface.methods.length, 1);

  const cls = result.inventory.classes.find(
    (item) => item.name === "BankService",
  );
  assert.ok(cls);
  assert.equal(cls.methods.length, 1);
  assert.equal(cls.properties.length, 1);

  const fn = result.inventory.functions.find(
    (item) => item.name === "processPayment",
  );
  assert.ok(fn);
  assert.equal(fn.isAsync, true);

  const arrow = result.inventory.functions.find(
    (item) => item.name === "computeRate",
  );
  assert.ok(arrow);
});

test("extractFileSymbols supports TSX files with JSX elements and hooks", () => {
  const code = `
import React from "react";

export function UserCard({ name }: { name: string }) {
  return <div className="card"><h1>{name}</h1></div>;
}
`;

  const sourceFile = ts.createSourceFile(
    "components/UserCard.tsx",
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  const result = extractFileSymbols(sourceFile);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(result.inventory.functions.length, 1);
  assert.equal(result.inventory.functions[0].name, "UserCard");
});

test("extractFileSymbols handles syntax errors gracefully and captures diagnostics without crashing", () => {
  const brokenCode = `
export function valid(): void {}
export function broken( {
`;

  const sourceFile = ts.createSourceFile(
    "src/broken.ts",
    brokenCode,
    ts.ScriptTarget.Latest,
    true,
  );

  const result = extractFileSymbols(sourceFile);
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.inventory.functions.some((fn) => fn.name === "valid"));
});
