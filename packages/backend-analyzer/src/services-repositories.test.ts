import { test } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import { extractServicesAndRepositories } from "./services-repositories.js";

function parseSource(
  code: string,
  fileName = "src/users.service.ts",
): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

test("extractServicesAndRepositories extracts service with constructor injection", () => {
  const code = `
import { Injectable } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UsersService {
  constructor(private readonly userRepo: UserRepository) {}

  async findAll() {
    return this.userRepo.findMany();
  }

  async create(data: any) {
    return this.userRepo.insertOne(data);
  }
}
`;

  const sf = parseSource(code);
  const { services, repositories } = extractServicesAndRepositories(
    sf,
    "src/users.service.ts",
  );

  assert.equal(services.length, 1);
  const svc = services[0];
  assert.ok(svc);
  assert.equal(svc!.name, "UsersService");
  assert.deepEqual(svc!.methods, ["findAll", "create"]);
  assert.deepEqual(svc!.injectedDependencies, ["UserRepository"]);
  assert.equal(repositories.length, 0);
});

test("extractServicesAndRepositories extracts repository with ORM detection", () => {
  const code = `
import { pgTable, text } from 'drizzle-orm/pg-core';

export class UserRepository {
  async findMany() {
    return [];
  }

  async insertOne(item: any) {
    return item;
  }
}
`;

  const sf = parseSource(code, "src/user.repository.ts");
  const { repositories } = extractServicesAndRepositories(
    sf,
    "src/user.repository.ts",
  );

  assert.equal(repositories.length, 1);
  const repo = repositories[0];
  assert.ok(repo);
  assert.equal(repo!.name, "UserRepository");
  assert.equal(repo!.ormType, "drizzle");
  assert.deepEqual(repo!.methods, ["findMany", "insertOne"]);
});

test("extractServicesAndRepositories extracts middleware and classifies kind", () => {
  const code = `
export function authMiddleware(req: any, res: any, next: any) {
  next();
}

export const validateRequest = (req: any, res: any, next: any) => {
  next();
};
`;

  const sf = parseSource(code, "src/middleware.ts");
  const { middleware } = extractServicesAndRepositories(
    sf,
    "src/middleware.ts",
  );

  assert.equal(middleware.length, 2);
  const auth = middleware.find((m) => m.name === "authMiddleware");
  assert.ok(auth);
  assert.equal(auth!.kind, "auth");

  const val = middleware.find((m) => m.name === "validateRequest");
  assert.ok(val);
  assert.equal(val!.kind, "validation");
});
