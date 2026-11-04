import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import { extractComponentsAndJsx } from "./components.js";
import { extractHooksAndContexts } from "./hooks-contexts.js";

describe("Hooks and Contexts Extractor", () => {
  const repoId = "repo_test";

  test("extracts standard hooks, custom hooks, and dependencies", () => {
    const code = `
      import { useState, useEffect } from 'react';

      function useCustomCounter() {
        const [count, setCount] = useState(0);
        return { count };
      }

      export function CounterComponent() {
        const [state, setState] = useState(0);
        const custom = useCustomCounter();

        useEffect(() => {
          document.title = String(state);
        }, [state]);

        return <div>{state}</div>;
      }
    `;

    const filePath = "src/components/Counter.tsx";
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const compResult = extractComponentsAndJsx(sourceFile, repoId, filePath);
    const result = extractHooksAndContexts(
      sourceFile,
      filePath,
      compResult.components,
    );

    assert.equal(result.hooks.length, 3);

    const useStateHook = result.hooks.find((h) => h.name === "useState");
    assert.ok(useStateHook);
    assert.equal(useStateHook.kind, "state");

    const useEffectHook = result.hooks.find((h) => h.name === "useEffect");
    assert.ok(useEffectHook);
    assert.equal(useEffectHook.kind, "effect");
    assert.deepEqual(useEffectHook.dependencies, ["state"]);

    const customHook = result.hooks.find((h) => h.name === "useCustomCounter");
    assert.ok(customHook);
    assert.equal(customHook.kind, "custom");

    const counterComp = result.updatedComponents.find(
      (c) => c.name === "CounterComponent",
    );
    assert.ok(counterComp);
    assert.equal(counterComp.hooksCount, 3);
  });

  test("extracts createContext, providers, and consumers", () => {
    const code = `
      import React, { createContext, useContext } from 'react';

      export const AuthContext = createContext({ user: null });

      export function AuthProvider({ children }: { children: React.ReactNode }) {
        return (
          <AuthContext.Provider value={{ user: 'Alice' }}>
            {children}
          </AuthContext.Provider>
        );
      }

      export function Profile() {
        const auth = useContext(AuthContext);
        return <div>{auth.user}</div>;
      }
    `;

    const filePath = "src/context/AuthContext.tsx";
    const sourceFile = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const compResult = extractComponentsAndJsx(sourceFile, repoId, filePath);
    const result = extractHooksAndContexts(
      sourceFile,
      filePath,
      compResult.components,
    );

    assert.equal(result.contexts.length, 1);
    const authCtx = result.contexts[0];
    assert.ok(authCtx);
    assert.equal(authCtx.name, "AuthContext");
    assert.equal(authCtx.providerComponentIds.length, 1);
    assert.equal(authCtx.consumerComponentIds.length, 1);

    const providerComp = compResult.components.find(
      (c) => c.name === "AuthProvider",
    );
    assert.ok(providerComp);
    assert.equal(authCtx.providerComponentIds[0], providerComp.id);

    const profileComp = compResult.components.find((c) => c.name === "Profile");
    assert.ok(profileComp);
    assert.equal(authCtx.consumerComponentIds[0], profileComp.id);
  });
});
