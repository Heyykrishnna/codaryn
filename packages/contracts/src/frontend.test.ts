import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import {
  frontendComponentSchema,
  frontendJsxElementSchema,
  frontendHookCallSchema,
  frontendContextSchema,
  frontendRouteSchema,
  frontendStateSchema,
  frontendApiClientCallSchema,
  frontendOverviewResponseSchema,
  type FrontendComponent,
  type FrontendRoute,
} from "./frontend.js";

describe("frontend contracts", () => {
  const dummyEvidence = {
    path: "src/components/Button.tsx",
    startLine: 1,
    endLine: 10,
  };

  test("validates frontend component schema with props", () => {
    const component: FrontendComponent = {
      id: "comp_123",
      name: "Button",
      filePath: "src/components/Button.tsx",
      kind: "function",
      exportType: "named",
      props: [
        { name: "variant", type: "string", required: false },
        { name: "onClick", type: "() => void", required: true },
      ],
      hooksCount: 0,
      renderedComponentsCount: 0,
      sourceEvidence: dummyEvidence,
    };

    const parsed = frontendComponentSchema.parse(component);
    assert.equal(parsed.name, "Button");
    assert.equal(parsed.props.length, 2);
  });

  test("validates JSX element rendering edges", () => {
    const element = {
      id: "jsx_123",
      sourceComponentId: "comp_parent",
      targetComponentName: "Button",
      targetComponentId: "comp_button",
      props: ["variant", "onClick"],
      isConditional: true,
      sourceEvidence: dummyEvidence,
    };

    const parsed = frontendJsxElementSchema.parse(element);
    assert.equal(parsed.targetComponentName, "Button");
    assert.equal(parsed.isConditional, true);
  });

  test("validates hook calls and dependencies", () => {
    const hook = {
      id: "hook_123",
      componentId: "comp_123",
      name: "useEffect",
      kind: "effect",
      dependencies: ["count", "fetchData"],
      sourceEvidence: dummyEvidence,
    };

    const parsed = frontendHookCallSchema.parse(hook);
    assert.equal(parsed.name, "useEffect");
    assert.equal(parsed.dependencies?.length, 2);
  });

  test("validates context providers and consumers", () => {
    const context = {
      id: "ctx_123",
      name: "ThemeContext",
      filePath: "src/context/ThemeContext.tsx",
      defaultValue: "'dark'",
      providerComponentIds: ["comp_provider"],
      consumerComponentIds: ["comp_header", "comp_footer"],
      sourceEvidence: dummyEvidence,
    };

    const parsed = frontendContextSchema.parse(context);
    assert.equal(parsed.name, "ThemeContext");
    assert.equal(parsed.consumerComponentIds.length, 2);
  });

  test("validates routes for Next.js App Router and dynamic parameters", () => {
    const route: FrontendRoute = {
      id: "route_123",
      framework: "nextjs_app",
      routePath: "/users/[id]",
      filePath: "app/users/[id]/page.tsx",
      componentName: "UserProfilePage",
      componentId: "comp_profile",
      dynamicParams: ["id"],
      isLayout: false,
      sourceEvidence: dummyEvidence,
    };

    const parsed = frontendRouteSchema.parse(route);
    assert.equal(parsed.routePath, "/users/[id]");
    assert.equal(parsed.dynamicParams[0], "id");
  });

  test("validates state management models", () => {
    const state = {
      id: "state_123",
      componentId: "comp_123",
      kind: "local",
      identifier: "count",
      initialValue: "0",
      sourceEvidence: dummyEvidence,
    };

    const parsed = frontendStateSchema.parse(state);
    assert.equal(parsed.identifier, "count");
  });

  test("validates API client calls and flags dynamic endpoints", () => {
    const call = {
      id: "api_123",
      componentId: "comp_123",
      filePath: "src/api/users.ts",
      method: "GET",
      endpoint: "/api/v1/users",
      isDynamic: false,
      clientType: "fetch",
      sourceEvidence: dummyEvidence,
    };

    const parsed = frontendApiClientCallSchema.parse(call);
    assert.equal(parsed.endpoint, "/api/v1/users");
    assert.equal(parsed.isDynamic, false);
  });

  test("validates frontend overview response", () => {
    const overview = {
      jobId: "job_123",
      detectedFrameworks: ["react", "nextjs"],
      totalComponents: 42,
      totalRoutes: 8,
      totalHooks: 65,
      totalContexts: 3,
      totalApiClients: 12,
      stateManagementPatterns: ["useState", "useContext", "zustand"],
    };

    const parsed = frontendOverviewResponseSchema.parse(overview);
    assert.equal(parsed.totalComponents, 42);
    assert.equal(parsed.detectedFrameworks.length, 2);
  });
});
