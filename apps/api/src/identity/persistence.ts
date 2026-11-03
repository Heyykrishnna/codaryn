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

export async function verifyAuthStorage(pool: Pool) {
  const tables = ["user", "session", "account", "verification", "rateLimit"];
  const result = await pool.query<{
    table_name: string;
    data_type: string;
    column_default: string | null;
  }>(
    "SELECT table_name,data_type,column_default FROM information_schema.columns WHERE table_schema='public' AND column_name='id' AND table_name=ANY($1::text[])",
    [tables],
  );
  if (
    result.rows.length !== tables.length ||
    result.rows.some(
      (row) =>
        row.data_type !== "uuid" ||
        !row.column_default?.includes("gen_random_uuid"),
    )
  )
    throw new Error(
      "Authentication UUID types or defaults do not match the runtime configuration",
    );
}
