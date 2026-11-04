import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import { extractRoutes } from "./routes.js";

describe("Route Extractor", () => {
  test("extracts Next.js App Router pages, layouts, and dynamic parameters", () => {
    const pageCode = `
      export default function UserDetailPage() {
        return <div>User Detail</div>;
      }
    `;

    const pagePath = "app/(dashboard)/users/[id]/page.tsx";
    const pageSource = ts.createSourceFile(
      pagePath,
      pageCode,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const routes = extractRoutes(pageSource, pagePath, [
      {
        id: "comp_user_detail",
        name: "UserDetailPage",
        filePath: pagePath,
        kind: "function",
        exportType: "default",
        props: [],
        hooksCount: 0,
        renderedComponentsCount: 0,
        sourceEvidence: { path: pagePath, startLine: 1, endLine: 5 },
      },
    ]);

    assert.equal(routes.length, 1);
    const route = routes[0];
    assert.ok(route);
    assert.equal(route.framework, "nextjs_app");
    assert.equal(route.routePath, "/users/[id]");
    assert.equal(route.isLayout, false);
    assert.deepEqual(route.dynamicParams, ["id"]);
    assert.equal(route.componentName, "UserDetailPage");
    assert.equal(route.componentId, "comp_user_detail");

    const layoutPath = "app/dashboard/layout.tsx";
    const layoutSource = ts.createSourceFile(
      layoutPath,
      `export default function Layout() { return <div>Layout</div>; }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const layoutRoutes = extractRoutes(layoutSource, layoutPath, []);
    assert.equal(layoutRoutes.length, 1);
    assert.equal(layoutRoutes[0]?.routePath, "/dashboard");
    assert.equal(layoutRoutes[0]?.isLayout, true);
  });

  test("extracts Next.js Pages Router routes", () => {
    const filePath = "pages/products/[category]/[id].tsx";
    const source = ts.createSourceFile(
      filePath,
      `export default function Product() { return <div>Product</div>; }`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const routes = extractRoutes(source, filePath, []);
    assert.equal(routes.length, 1);
    assert.equal(routes[0]?.framework, "nextjs_pages");
    assert.equal(routes[0]?.routePath, "/products/[category]/[id]");
    assert.deepEqual(routes[0]?.dynamicParams, ["category", "id"]);
  });

  test("extracts React Router JSX routes", () => {
    const code = `
      import { Route, Routes } from 'react-router-dom';
      import { LoginPage } from './LoginPage';
      import { Dashboard } from './Dashboard';

      export function AppRoutes() {
        return (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/items/:itemId" Component={Dashboard} />
          </Routes>
        );
      }
    `;

    const filePath = "src/AppRoutes.tsx";
    const source = ts.createSourceFile(
      filePath,
      code,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    const routes = extractRoutes(source, filePath, [
      {
        id: "comp_login",
        name: "LoginPage",
        filePath: "src/LoginPage.tsx",
        kind: "function",
        exportType: "named",
        props: [],
        hooksCount: 0,
        renderedComponentsCount: 0,
        sourceEvidence: { path: "src/LoginPage.tsx", startLine: 1, endLine: 5 },
      },
    ]);

    assert.equal(routes.length, 2);
    const loginRoute = routes.find((r) => r.routePath === "/login");
    assert.ok(loginRoute);
    assert.equal(loginRoute.framework, "react_router");
    assert.equal(loginRoute.componentName, "LoginPage");
    assert.equal(loginRoute.componentId, "comp_login");

    const itemRoute = routes.find((r) => r.routePath === "/items/:itemId");
    assert.ok(itemRoute);
    assert.deepEqual(itemRoute.dynamicParams, ["itemId"]);
  });
});
