import { test } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import type {
  BackendRoute,
  BackendController,
  BackendService,
  BackendRepository,
} from "@codaryn/contracts";
import {
  extractValidationPatterns,
  extractAuthenticationPatterns,
  linkRequestFlows,
} from "./request-flow.js";

function parseSource(
  code: string,
  fileName = "src/validation.ts",
): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

test("extractValidationPatterns detects zod, joi, and class-validator schemas", () => {
  const code = `
import { z } from 'zod';
const userSchema = z.object({ name: z.string() });

class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
`;

  const sf = parseSource(code);
  const patterns = extractValidationPatterns(sf);

  assert.ok(patterns.includes("zod"));
  assert.ok(patterns.includes("class-validator"));
});

test("extractAuthenticationPatterns detects jwt, guards, and passport", () => {
  const code = `
import { UseGuards } from '@nestjs/common';
import jwt from 'jsonwebtoken';

@UseGuards(AuthGuard)
export class SecuredController {
  verify(token: string) {
    return jwt.verify(token, 'secret');
  }
}
`;

  const sf = parseSource(code);
  const patterns = extractAuthenticationPatterns(sf);

  assert.ok(patterns.includes("jwt"));
  assert.ok(patterns.includes("guards"));
});

test("linkRequestFlows connects route through controller, service, and repository", () => {
  const routes: BackendRoute[] = [
    {
      id: "r1",
      framework: "nestjs",
      method: "GET",
      path: "/users",
      filePath: "src/users.controller.ts",
      handlerName: "findAll",
      handlerSymbolId: null,
      controllerName: "UsersController",
      middleware: ["AuthGuard"],
      isDynamic: false,
      sourceEvidence: {
        path: "src/users.controller.ts",
        startLine: 10,
        endLine: 12,
      },
    },
  ];

  const controllers: BackendController[] = [
    {
      id: "c1",
      name: "UsersController",
      filePath: "src/users.controller.ts",
      framework: "nestjs",
      routesCount: 1,
      basePath: "users",
      sourceEvidence: {
        path: "src/users.controller.ts",
        startLine: 5,
        endLine: 20,
      },
    },
  ];

  const services: BackendService[] = [
    {
      id: "s1",
      name: "UsersService",
      filePath: "src/users.service.ts",
      methods: ["findAll"],
      injectedDependencies: ["UserRepository"],
      sourceEvidence: {
        path: "src/users.service.ts",
        startLine: 5,
        endLine: 15,
      },
    },
  ];

  const repositories: BackendRepository[] = [
    {
      id: "repo1",
      name: "UserRepository",
      filePath: "src/user.repository.ts",
      ormType: "drizzle",
      methods: ["findMany"],
      sourceEvidence: {
        path: "src/user.repository.ts",
        startLine: 5,
        endLine: 15,
      },
    },
  ];

  const flows = linkRequestFlows(routes, controllers, services, repositories);

  assert.equal(flows.length, 1);
  const flow = flows[0];
  assert.ok(flow);
  assert.equal(flow!.routePath, "/users");
  assert.equal(flow!.controllerName, "UsersController");
  assert.deepEqual(flow!.serviceNames, ["UsersService"]);
  assert.deepEqual(flow!.repositoryNames, ["UserRepository"]);
  assert.deepEqual(flow!.middlewareChain, ["AuthGuard"]);
});
