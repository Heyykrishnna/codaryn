import { test } from "node:test";
import { strict as assert } from "node:assert";
import { databasePoolOptions } from "./client.js";

test("remote PostgreSQL connections enforce certificate verification and bounded pooling", () => {
  const options = databasePoolOptions(
    "postgresql://db.example.com/app?sslmode=disable&channel_binding=require",
  );
  assert.equal(
    new URL(String(options.connectionString)).searchParams.get("sslmode"),
    "verify-full",
  );
  assert.equal(options.enableChannelBinding, true);
  assert.equal(options.max, 5);
  assert.equal(options.connectionTimeoutMillis, 15000);
});
test("local PostgreSQL remains usable and unsupported protocols fail closed", () => {
  const options = databasePoolOptions("postgresql://127.0.0.1:5432/test");
  assert.equal(options.enableChannelBinding, false);
  assert.equal(
    new URL(String(options.connectionString)).searchParams.get("sslmode"),
    null,
  );
  assert.throws(
    () => databasePoolOptions("https://db.example.com/app"),
    /PostgreSQL/,
  );
});
