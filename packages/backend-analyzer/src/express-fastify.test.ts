import { test } from "node:test";
import { strict as assert } from "node:assert";
import ts from "typescript";
import {
  extractExpressRoutes,
  extractFastifyRoutes,
  normalizeRoutePath,
} from "./express-fastify.js";

function parseSource(code: string, fileName = "src/routes.ts"): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
}

test("normalizeRoutePath handles slashes and prefixes correctly", () => {
  assert.equal(normalizeRoutePath("/api/v1", "/users"), "/api/v1/users");
  assert.equal(normalizeRoutePath("/api/v1/", "users/"), "/api/v1/users/");
  assert.equal(normalizeRoutePath("", "/health"), "/health");
  assert.equal(normalizeRoutePath("/", "/"), "/");
});

test("extractExpressRoutes detects endpoints, middleware, and handlers", () => {
  const code = `
const express = require('express');
const app = express();
const router = express.Router();

app.use('/api', router);

router.get('/users', requireAuth, userController.listUsers);
router.post('/users', requireAuth, validateBody, userController.createUser);
app.delete('/users/:id', deleteUserHandler);
`;

  const sf = parseSource(code);
  const routes = extractExpressRoutes(sf, "src/routes.ts");

  assert.equal(routes.length, 3);
  const getUsers = routes.find((r) => r.method === "GET");
  assert.ok(getUsers);
  assert.equal(getUsers!.path, "/api/users");
  assert.equal(getUsers!.handlerName, "listUsers");
  assert.equal(getUsers!.controllerName, "userController");
  assert.deepEqual(getUsers!.middleware, ["requireAuth"]);
  assert.equal(getUsers!.isDynamic, false);

  const postUsers = routes.find((r) => r.method === "POST");
  assert.ok(postUsers);
  assert.deepEqual(postUsers!.middleware, ["requireAuth", "validateBody"]);

  const deleteUser = routes.find((r) => r.method === "DELETE");
  assert.ok(deleteUser);
  assert.equal(deleteUser!.path, "/users/:id");
  assert.equal(deleteUser!.handlerName, "deleteUserHandler");
});

test("extractExpressRoutes flags template literals as dynamic routes", () => {
  const code = `
const router = express.Router();
const version = 'v1';
router.get(\`/api/\${version}/items\`, getItems);
`;

  const sf = parseSource(code);
  const routes = extractExpressRoutes(sf, "src/routes.ts");

  assert.equal(routes.length, 1);
  assert.equal(routes[0]?.isDynamic, true);
  assert.equal(routes[0]?.handlerName, "getItems");
});

test("extractFastifyRoutes detects routes with preHandler and plugin prefix", () => {
  const code = `
import Fastify from 'fastify';
const fastify = Fastify();

fastify.register(userRoutes, { prefix: '/v2' });

fastify.get('/health', getHealth);
fastify.post('/orders', { preHandler: [authGuard, rateLimiter] }, createOrder);
`;

  const sf = parseSource(code);
  const routes = extractFastifyRoutes(sf, "src/server.ts");

  assert.equal(routes.length, 2);
  const health = routes.find((r) => r.method === "GET");
  assert.ok(health);
  assert.equal(health!.path, "/v2/health");
  assert.equal(health!.handlerName, "getHealth");
  assert.equal(health!.middleware.length, 0);

  const order = routes.find((r) => r.method === "POST");
  assert.ok(order);
  assert.equal(order!.path, "/v2/orders");
  assert.deepEqual(order!.middleware, ["authGuard", "rateLimiter"]);
  assert.equal(order!.handlerName, "createOrder");
});
