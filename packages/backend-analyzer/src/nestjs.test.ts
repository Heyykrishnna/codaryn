import { test } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import { extractNestJsControllersAndRoutes } from "./nestjs.js";

function parseSource(
  code: string,
  fileName = "src/users.controller.ts",
): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

test("extractNestJsControllersAndRoutes extracts controller and decorated routes", () => {
  const code = `
import { Controller, Get, Post, Delete, UseGuards, UsePipes } from '@nestjs/common';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  @Get()
  findAll() {
    return [];
  }

  @Get(':id')
  findOne() {
    return {};
  }

  @Post()
  @UsePipes(ValidationPipe)
  create() {
    return {};
  }

  @Delete(':id')
  remove() {
    return {};
  }
}
`;

  const sf = parseSource(code);
  const { controllers, routes } = extractNestJsControllersAndRoutes(
    sf,
    "src/users.controller.ts",
  );

  assert.equal(controllers.length, 1);
  const ctrl = controllers[0];
  assert.ok(ctrl);
  assert.equal(ctrl!.name, "UsersController");
  assert.equal(ctrl!.basePath, "users");
  assert.equal(ctrl!.routesCount, 4);

  assert.equal(routes.length, 4);
  const getList = routes.find((r) => r.method === "GET" && r.path === "/users");
  assert.ok(getList);
  assert.equal(getList!.handlerName, "findAll");
  assert.deepEqual(getList!.middleware, ["AuthGuard"]);

  const getOne = routes.find(
    (r) => r.method === "GET" && r.path === "/users/:id",
  );
  assert.ok(getOne);
  assert.equal(getOne!.isDynamic, true);

  const postCreate = routes.find((r) => r.method === "POST");
  assert.ok(postCreate);
  assert.deepEqual(postCreate!.middleware, ["AuthGuard", "ValidationPipe"]);
});

test("extractNestJsControllersAndRoutes handles empty and object path Controller decorator", () => {
  const code = `
@Controller({ path: 'api/v1/auth' })
export class AuthController {
  @Post('login')
  login() {}
}

@Controller()
export class RootController {
  @Get('health')
  health() {}
}
`;

  const sf = parseSource(code);
  const { controllers, routes } = extractNestJsControllersAndRoutes(
    sf,
    "src/auth.controller.ts",
  );

  assert.equal(controllers.length, 2);
  const authRoute = routes.find((r) => r.handlerName === "login");
  assert.ok(authRoute);
  assert.equal(authRoute!.path, "/api/v1/auth/login");

  const healthRoute = routes.find((r) => r.handlerName === "health");
  assert.ok(healthRoute);
  assert.equal(healthRoute!.path, "/health");
});
