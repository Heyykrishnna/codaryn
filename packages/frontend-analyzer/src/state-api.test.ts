import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import { extractComponentsAndJsx } from "./components.js";
import { extractStateAndApiCalls } from "./state-api.js";

describe("State and API Call Extractor", () => {
  const repoId = "repo_test";

  test("extracts local state, context state, and external state management patterns", () => {
    const code = `
      import { useState, useContext } from 'react';
      import { useSelector } from 'react-redux';
      import { useQuery } from '@tanstack/react-query';

      export function Dashboard() {
        const [filter, setFilter] = useState('all');
        const theme = useContext(ThemeContext);
        const user = useSelector((state: any) => state.auth.user);
        const { data } = useQuery(['items'], fetchItems);

        return <div>Dashboard</div>;
      }
    `;

    const filePath = "src/Dashboard.tsx";
    const source = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const compResult = extractComponentsAndJsx(source, repoId, filePath);
    const result = extractStateAndApiCalls(
      source,
      filePath,
      compResult.components,
    );

    assert.equal(result.state.length, 4);

    const localState = result.state.find((s) => s.kind === "local");
    assert.ok(localState);
    assert.equal(localState.identifier, "filter");
    assert.equal(localState.initialValue, "'all'");

    const contextState = result.state.find((s) => s.kind === "context");
    assert.ok(contextState);
    assert.equal(contextState.identifier, "theme");

    const reduxState = result.state.find((s) => s.kind === "redux");
    assert.ok(reduxState);
    assert.equal(reduxState.identifier, "user");

    const queryState = result.state.find((s) => s.kind === "query");
    assert.ok(queryState);
    assert.equal(queryState.identifier, "{ data }");
  });

  test("extracts static and dynamic API client calls with methods", () => {
    const code = `
      export function ApiDemo() {
        async function load() {
          const res = await fetch('/api/v1/users', { method: 'POST' });
          const id = '123';
          const dynamicRes = await fetch(\`/api/v1/users/\${id}\`);
          const axiosRes = await axios.get('/api/v1/items');
          const customRes = await api.delete('/api/v1/items/42');
        }

        return <button onClick={load}>Load</button>;
      }
    `;

    const filePath = "src/ApiDemo.tsx";
    const source = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const compResult = extractComponentsAndJsx(source, repoId, filePath);
    const result = extractStateAndApiCalls(
      source,
      filePath,
      compResult.components,
    );

    assert.equal(result.apiCalls.length, 4);

    const staticFetch = result.apiCalls.find(
      (c) => c.endpoint === "/api/v1/users",
    );
    assert.ok(staticFetch);
    assert.equal(staticFetch.method, "POST");
    assert.equal(staticFetch.isDynamic, false);
    assert.equal(staticFetch.clientType, "fetch");

    const dynamicFetch = result.apiCalls.find((c) => c.isDynamic === true);
    assert.ok(dynamicFetch);
    assert.equal(dynamicFetch.method, "GET");
    assert.equal(dynamicFetch.clientType, "fetch");

    const axiosCall = result.apiCalls.find(
      (c) => c.endpoint === "/api/v1/items",
    );
    assert.ok(axiosCall);
    assert.equal(axiosCall.method, "GET");
    assert.equal(axiosCall.isDynamic, false);
    assert.equal(axiosCall.clientType, "axios");

    const customCall = result.apiCalls.find(
      (c) => c.endpoint === "/api/v1/items/42",
    );
    assert.ok(customCall);
    assert.equal(customCall.method, "DELETE");
    assert.equal(customCall.clientType, "custom");
  });
});
