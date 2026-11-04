import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import { extractComponentsAndJsx } from "./components.js";

describe("Component and JSX Extractor", () => {
  const repoId = "repo_test";

  test("extracts function components, props, and JSX elements", () => {
    const code = `
      interface ButtonProps {
        variant?: string;
        onClick: () => void;
      }
      export function Button(props: ButtonProps) {
        return <button onClick={props.onClick}>{props.variant}</button>;
      }

      export default function Header() {
        return (
          <header>
            <Button variant="primary" onClick={() => {}} />
          </header>
        );
      }
    `;

    const sourceFile = ts.createSourceFile(
      "src/components/Header.tsx",
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const result = extractComponentsAndJsx(
      sourceFile,
      repoId,
      "src/components/Header.tsx",
    );

    assert.equal(result.components.length, 2);

    const button = result.components.find((c) => c.name === "Button");
    assert.ok(button);
    assert.equal(button.kind, "function");
    assert.equal(button.exportType, "named");
    assert.equal(button.props.length, 2);

    const header = result.components.find((c) => c.name === "Header");
    assert.ok(header);
    assert.equal(header.kind, "function");
    assert.equal(header.exportType, "default");
    assert.equal(header.renderedComponentsCount, 1);

    assert.equal(result.jsxElements.length, 1);
    assert.equal(result.jsxElements[0]?.targetComponentName, "Button");
    assert.equal(result.jsxElements[0]?.isConditional, false);
    assert.deepEqual(result.jsxElements[0]?.props, ["onClick", "variant"]);
  });

  test("extracts arrow functions, memo, and conditional JSX elements", () => {
    const code = `
      import React, { memo } from 'react';

      export const Sidebar = memo(({ isOpen }: { isOpen: boolean }) => {
        return (
          <aside>
            {isOpen && <NavigationMenu />}
          </aside>
        );
      });
    `;

    const sourceFile = ts.createSourceFile(
      "src/components/Sidebar.tsx",
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const result = extractComponentsAndJsx(
      sourceFile,
      repoId,
      "src/components/Sidebar.tsx",
    );

    assert.equal(result.components.length, 1);
    const sidebar = result.components[0];
    assert.equal(sidebar?.name, "Sidebar");
    assert.equal(sidebar?.kind, "memo");
    assert.equal(sidebar?.exportType, "named");

    assert.equal(result.jsxElements.length, 1);
    assert.equal(result.jsxElements[0]?.targetComponentName, "NavigationMenu");
    assert.equal(result.jsxElements[0]?.isConditional, true);
  });
});
