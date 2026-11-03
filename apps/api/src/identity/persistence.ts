import type { Pool } from "pg";
export function authPersistenceOptions(pool: Pool) {
  return {
    database: pool,
    advanced: { database: { generateId: "uuid" as const } },
    rateLimit: {
      enabled: true,
      storage: "database" as const,
      window: 60,
      max: 30,
    },
  };
}
