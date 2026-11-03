import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { Pool, type PoolConfig } from "pg";

export function loadDatabaseEnvironment() {
  const configuration = fileURLToPath(
    new URL("../../../.env", import.meta.url),
  );
  if (existsSync(configuration)) {
    const explicitDatabase = process.env.DATABASE_URL;
    const explicitDirect = process.env.DIRECT_DATABASE_URL;
    loadEnvFile(configuration);
    if (explicitDatabase && !explicitDirect)
      delete process.env.DIRECT_DATABASE_URL;
  }
}

export function databasePoolOptions(connectionString: string): PoolConfig {
  const url = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("A PostgreSQL database URL is required");
  const local = ["localhost", "127.0.0.1", "[::1]", "postgres"].includes(
    url.hostname,
  );
  if (!local) url.searchParams.set("sslmode", "verify-full");
  return {
    connectionString: url.toString(),
    enableChannelBinding: !local,
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
  };
}

export function createDatabasePool(migration = false) {
  loadDatabaseEnvironment();
  const connection = migration
    ? (process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL)
    : process.env.DATABASE_URL;
  if (!connection) throw new Error("DATABASE_URL must be configured");
  return new Pool(databasePoolOptions(connection));
}
